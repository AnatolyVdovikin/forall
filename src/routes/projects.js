import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../database/connection.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { MISSION_REWARDS } from '../utils/experience.js';
import { getLevelFromExperience, getProgressToNextLevel } from '../utils/experience.js';
import { processCollectiveProject } from '../services/projectProcessor.js';
import logger from '../utils/logger.js';
import { notifyNewParticipant, notifyProjectCompleted } from '../services/pushNotifications.js';
import { cacheMiddleware, deleteCachePattern } from '../utils/cache.js';

const router = express.Router();

// Получить список проектов
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { limit = 20, offset = 0, status, sort = 'popular' } = req.query;
    const userId = req.user?.id;

    let orderBy = 'p.created_at DESC';
    if (sort === 'popular') {
      orderBy = 'p.views_count DESC, p.likes_count DESC';
    } else if (sort === 'new') {
      orderBy = 'p.created_at DESC';
    } else if (sort === 'trending') {
      orderBy = 'p.participants_count DESC, p.created_at DESC';
    }

    let query = `
      SELECT 
        p.id, p.title, p.description, p.type, p.final_media_url,
        p.thumbnail_url, p.participants_count, p.views_count, p.likes_count,
        p.status, p.deadline, p.created_at,
        c.title as challenge_title, c.type as challenge_type,
        CASE WHEN pl.id IS NOT NULL THEN true ELSE false END as is_liked
      FROM projects p
      LEFT JOIN challenges c ON p.challenge_id = c.id
      LEFT JOIN project_likes pl ON p.id = pl.project_id AND pl.user_id = $1
      WHERE 1=1
    `;

    const params = [userId || null];
    let paramIndex = 2;

    if (status) {
      query += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY ${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      projects: result.rows,
      has_more: result.rows.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Ошибка получения проектов:', error);
    res.status(500).json({ error: 'Ошибка получения проектов' });
  }
});

// Получить один проект
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const projectResult = await pool.query(
      `SELECT 
        p.*, c.title as challenge_title, c.description as challenge_description,
        CASE WHEN pl.id IS NOT NULL THEN true ELSE false END as is_liked
      FROM projects p
      LEFT JOIN challenges c ON p.challenge_id = c.id
      LEFT JOIN project_likes pl ON p.id = pl.project_id AND pl.user_id = $1
      WHERE p.id = $2`,
      [userId || null, id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    // Получаем участников проекта
    const participantsResult = await pool.query(
      `SELECT 
        cc.id, cc.media_url, cc.media_type, cc.is_featured, cc.likes_count, cc.created_at,
        u.id as user_id, u.username, u.avatar_url, u.level
      FROM challenge_completions cc
      JOIN users u ON cc.user_id = u.id
      WHERE cc.project_id = $1
      ORDER BY cc.is_featured DESC, cc.created_at DESC
      LIMIT 50`,
      [id]
    );

    // Увеличиваем счетчик просмотров
    await pool.query(
      'UPDATE projects SET views_count = views_count + 1 WHERE id = $1',
      [id]
    );

    res.json({
      ...projectResult.rows[0],
      participants: participantsResult.rows
    });
  } catch (error) {
    console.error('Ошибка получения проекта:', error);
    res.status(500).json({ error: 'Ошибка получения проекта' });
  }
});

// Выполнить челлендж (добавить в проект)
router.post('/:projectId/complete', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { challengeId, mediaUrl, mediaType, durationSeconds } = req.body;
    const userId = req.user.id;

    if (!mediaUrl || !mediaType) {
      return res.status(400).json({ error: 'Укажите медиа файл и тип' });
    }

    // Проверяем существование проекта и челленджа
    const projectResult = await pool.query(
      'SELECT id, status, max_participants, participants_count FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    const project = projectResult.rows[0];

    if (project.status !== 'collecting') {
      return res.status(400).json({ error: 'Проект больше не принимает участников' });
    }

    if (project.max_participants && project.participants_count >= project.max_participants) {
      return res.status(400).json({ error: 'Достигнуто максимальное количество участников' });
    }

    // Проверяем, не выполнял ли уже пользователь этот челлендж
    const existingCompletion = await pool.query(
      'SELECT id FROM challenge_completions WHERE user_id = $1 AND challenge_id = $2',
      [userId, challengeId]
    );

    if (existingCompletion.rows.length > 0) {
      return res.status(400).json({ error: 'Вы уже выполнили этот челлендж' });
    }

    const completionId = uuidv4();

    // Создаем запись о выполнении
    await pool.query(
      `INSERT INTO challenge_completions (
        id, user_id, challenge_id, project_id, media_url, media_type, duration_seconds
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [completionId, userId, challengeId, projectId, mediaUrl, mediaType, durationSeconds || null]
    );

    // Обновляем счетчики
    await pool.query(
      'UPDATE projects SET participants_count = participants_count + 1 WHERE id = $1',
      [projectId]
    );

    await pool.query(
      'UPDATE challenges SET completions_count = completions_count + 1 WHERE id = $1',
      [challengeId]
    );

    // Награждаем пользователя
    const experienceReward = MISSION_REWARDS.experience;
    const coinsReward = MISSION_REWARDS.coins;

    await pool.query(
      'UPDATE users SET experience = experience + $1, coins = coins + $2 WHERE id = $3',
      [experienceReward, coinsReward, userId]
    );

    // Получаем обновленные данные пользователя
    const userResult = await pool.query(
      'SELECT experience, coins FROM users WHERE id = $1',
      [userId]
    );

    const newExperience = userResult.rows[0].experience;
    const newLevel = getLevelFromExperience(newExperience);
    const progress = getProgressToNextLevel(newExperience, newLevel);

    // Проверяем достижения
    await checkAchievements(userId, 'first_mission');

    // Отправляем WebSocket событие
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${projectId}`).emit('new-participant', {
        completionId,
        userId,
        username: req.user.username,
        mediaUrl,
        mediaType
      });
    }

    // Отправляем push-уведомления
    notifyNewParticipant(projectId, req.user.username).catch(err => {
      logger.error('Ошибка отправки уведомления о новом участнике', err);
    });

    res.status(201).json({
      completion: {
        id: completionId,
        media_url: mediaUrl,
        media_type: mediaType
      },
      reward: {
        experience: experienceReward,
        coins: coinsReward,
        new_level: newLevel,
        new_experience: newExperience,
        progress_to_next_level: progress
      }
    });
  } catch (error) {
    logger.error('Ошибка выполнения челленджа', {
      error: error.message,
      projectId: req.params.projectId,
      userId: req.user.id,
    });
    res.status(500).json({ 
      error: 'Ошибка выполнения челленджа',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Лайкнуть проект
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Проверяем, не лайкал ли уже
    const existingLike = await pool.query(
      'SELECT id FROM project_likes WHERE user_id = $1 AND project_id = $2',
      [userId, id]
    );

    if (existingLike.rows.length > 0) {
      // Убираем лайк
      await pool.query(
        'DELETE FROM project_likes WHERE user_id = $1 AND project_id = $2',
        [userId, id]
      );
      await pool.query(
        'UPDATE projects SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1',
        [id]
      );
      res.json({ liked: false });
    } else {
      // Добавляем лайк
      await pool.query(
        'INSERT INTO project_likes (user_id, project_id) VALUES ($1, $2)',
        [userId, id]
      );
      await pool.query(
        'UPDATE projects SET likes_count = likes_count + 1 WHERE id = $1',
        [id]
      );
      res.json({ liked: true });
    }
  } catch (error) {
    console.error('Ошибка лайка проекта:', error);
    res.status(500).json({ error: 'Ошибка лайка проекта' });
  }
});

// Обработать проект (объединить медиа)
router.post('/:id/process', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверяем права (только создатель проекта или админ)
    const projectResult = await pool.query(
      'SELECT creator_id FROM projects WHERE id = $1',
      [id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    // В production можно добавить проверку на админа
    // if (projectResult.rows[0].creator_id !== req.user.id && !req.user.is_admin) {
    //   return res.status(403).json({ error: 'Нет прав на обработку проекта' });
    // }

    logger.info(`Начало обработки проекта ${id}`, { userId: req.user.id });

    const result = await processCollectiveProject(id);

    // Отправляем WebSocket событие
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${id}`).emit('project-processed', {
        projectId: id,
        finalMediaUrl: result.finalMediaUrl,
        thumbnailUrl: result.thumbnailUrl,
      });
    }

    res.json({
      success: true,
      message: 'Проект успешно обработан',
      ...result,
    });
  } catch (error) {
    logger.error('Ошибка обработки проекта', {
      error: error.message,
      projectId: req.params.id,
      userId: req.user.id,
    });
    res.status(500).json({ 
      error: 'Ошибка обработки проекта',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Создать проект
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      challenge_id,
      title,
      description,
      type,
      max_participants,
      deadline
    } = req.body;

    if (!title || !type) {
      return res.status(400).json({ error: 'Укажите название и тип проекта' });
    }

    const projectId = uuidv4();

    await pool.query(
      `INSERT INTO projects (
        id, challenge_id, title, description, type,
        max_participants, deadline, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'collecting')`,
      [projectId, challenge_id, title, description, type, max_participants || null, deadline || null]
    );

    // Обновляем челлендж, связывая с проектом
    if (challenge_id) {
      await pool.query(
        'UPDATE challenges SET project_id = $1 WHERE id = $2',
        [projectId, challenge_id]
      );
    }

    const result = await pool.query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );

    // Очищаем кэш проектов
    await deleteCachePattern('cache:/api/projects*').catch(() => {});

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Ошибка создания проекта', {
      error: error.message,
      userId: req.user.id,
    });
    res.status(500).json({ 
      error: 'Ошибка создания проекта',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Вспомогательная функция для проверки достижений
async function checkAchievements(userId, achievementCode) {
  try {
    // Проверяем, есть ли уже это достижение
    const existing = await pool.query(
      `SELECT ua.id FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1 AND a.code = $2`,
      [userId, achievementCode]
    );

    if (existing.rows.length > 0) {
      return; // Уже есть
    }

    // Получаем достижение
    const achievementResult = await pool.query(
      'SELECT id, reward_coins, reward_experience FROM achievements WHERE code = $1',
      [achievementCode]
    );

    if (achievementResult.rows.length === 0) {
      return; // Достижение не найдено
    }

    const achievement = achievementResult.rows[0];

    // Добавляем достижение
    await pool.query(
      'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2)',
      [userId, achievement.id]
    );

    // Награждаем
    if (achievement.reward_coins > 0 || achievement.reward_experience > 0) {
      await pool.query(
        'UPDATE users SET coins = coins + $1, experience = experience + $2 WHERE id = $3',
        [achievement.reward_coins, achievement.reward_experience, userId]
      );
    }
  } catch (error) {
    console.error('Ошибка проверки достижений:', error);
  }
}

export default router;
