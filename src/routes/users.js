import express from 'express';
import pool from '../database/connection.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { getLevelFromExperience, getProgressToNextLevel } from '../utils/experience.js';

const router = express.Router();

// Получить профиль пользователя
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    const result = await pool.query(
      `SELECT 
        id, username, avatar_url, level, experience, coins,
        city, school, is_premium, created_at
      FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = result.rows[0];
    const level = getLevelFromExperience(user.experience);
    const progress = getProgressToNextLevel(user.experience, level);

    // Статистика
    const statsResult = await pool.query(
      `SELECT 
        COUNT(DISTINCT cc.id) as completions_count,
        COUNT(DISTINCT c.id) as challenges_created,
        COUNT(DISTINCT cc.project_id) as projects_participated
      FROM users u
      LEFT JOIN challenge_completions cc ON u.id = cc.user_id
      LEFT JOIN challenges c ON u.id = c.creator_id
      WHERE u.id = $1
      GROUP BY u.id`,
      [id]
    );

    // Проверяем подписку
    let is_following = false;
    if (currentUserId) {
      const followResult = await pool.query(
        'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
        [currentUserId, id]
      );
      is_following = followResult.rows.length > 0;
    }

    res.json({
      ...user,
      level,
      progress_to_next_level: progress,
      stats: statsResult.rows[0] || {
        completions_count: 0,
        challenges_created: 0,
        projects_participated: 0
      },
      is_following
    });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});

// Обновить профиль
router.patch('/me', authenticate, async (req, res) => {
  try {
    const { username, avatar_url, city, school } = req.body;
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (username !== undefined) {
      updates.push(`username = $${paramIndex}`);
      values.push(username);
      paramIndex++;
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramIndex}`);
      values.push(avatar_url);
      paramIndex++;
    }
    if (city !== undefined) {
      updates.push(`city = $${paramIndex}`);
      values.push(city);
      paramIndex++;
    }
    if (school !== undefined) {
      updates.push(`school = $${paramIndex}`);
      values.push(school);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }

    values.push(req.user.id);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    const result = await pool.query(
      'SELECT id, username, avatar_url, city, school FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

// Получить достижения пользователя
router.get('/:id/achievements', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        a.id, a.code, a.title, a.description, a.icon_url,
        ua.unlocked_at
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1
      ORDER BY ua.unlocked_at DESC`,
      [id]
    );

    res.json({ achievements: result.rows });
  } catch (error) {
    console.error('Ошибка получения достижений:', error);
    res.status(500).json({ error: 'Ошибка получения достижений' });
  }
});

// Подписаться/отписаться
router.post('/:id/follow', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const followerId = req.user.id;

    if (id === followerId) {
      return res.status(400).json({ error: 'Нельзя подписаться на себя' });
    }

    // Проверяем существование пользователя
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Проверяем, подписан ли уже
    const existingFollow = await pool.query(
      'SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, id]
    );

    if (existingFollow.rows.length > 0) {
      // Отписываемся
      await pool.query(
        'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
        [followerId, id]
      );
      res.json({ following: false });
    } else {
      // Подписываемся
      await pool.query(
        'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
        [followerId, id]
      );
      res.json({ following: true });
    }
  } catch (error) {
    console.error('Ошибка подписки:', error);
    res.status(500).json({ error: 'Ошибка подписки' });
  }
});

export default router;
