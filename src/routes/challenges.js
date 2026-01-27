import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../database/connection.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { cacheMiddleware, getCache, setCache } from '../utils/cache.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Получить список челленджей для свайпера
router.get('/swipe', optionalAuth, async (req, res) => {
  try {
    const { limit = 10, offset = 0, location_type, location_value } = req.query;
    const userId = req.user?.id;

    let query = `
      SELECT 
        c.id, c.title, c.description, c.type, c.duration_seconds,
        c.music_url, c.template_url, c.filter_config,
        c.project_id, c.is_premium, c.location_type, c.location_value,
        c.views_count, c.completions_count,
        u.username as creator_username, u.avatar_url as creator_avatar,
        p.title as project_title, p.thumbnail_url as project_thumbnail,
        CASE WHEN cc.id IS NOT NULL THEN true ELSE false END as is_completed
      FROM challenges c
      LEFT JOIN users u ON c.creator_id = u.id
      LEFT JOIN projects p ON c.project_id = p.id
      LEFT JOIN challenge_completions cc ON c.id = cc.challenge_id AND cc.user_id = $1
      WHERE c.is_active = true
    `;

    const params = [userId || null];
    let paramIndex = 2;

    // Фильтр по локации
    if (location_type && location_value) {
      query += ` AND (c.location_type = $${paramIndex} OR c.location_type = 'global')`;
      params.push(location_type);
      paramIndex++;
      
      if (location_type !== 'global') {
        query += ` AND (c.location_value = $${paramIndex} OR c.location_value IS NULL)`;
        params.push(location_value);
        paramIndex++;
      }
    }

    // Фильтр премиум контента
    if (!req.user?.is_premium) {
      query += ` AND c.is_premium = false`;
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      challenges: result.rows,
      has_more: result.rows.length === parseInt(limit)
    });
  } catch (error) {
    logger.error('Ошибка получения челленджей', {
      error: error.message,
      userId: req.user?.id,
    });
    res.status(500).json({ 
      error: 'Ошибка получения челленджей',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Получить один челлендж
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await pool.query(
      `SELECT 
        c.*,
        u.username as creator_username, u.avatar_url as creator_avatar,
        p.title as project_title, p.description as project_description,
        p.participants_count, p.views_count, p.likes_count,
        CASE WHEN cc.id IS NOT NULL THEN true ELSE false END as is_completed
      FROM challenges c
      LEFT JOIN users u ON c.creator_id = u.id
      LEFT JOIN projects p ON c.project_id = p.id
      LEFT JOIN challenge_completions cc ON c.id = cc.challenge_id AND cc.user_id = $1
      WHERE c.id = $2 AND c.is_active = true`,
      [userId || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Челлендж не найден' });
    }

    // Увеличиваем счетчик просмотров
    await pool.query(
      'UPDATE challenges SET views_count = views_count + 1 WHERE id = $1',
      [id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Ошибка получения челленджа', {
      error: error.message,
      challengeId: req.params.id,
    });
    res.status(500).json({ 
      error: 'Ошибка получения челленджа',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Создать челлендж
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      duration_seconds = 30,
      music_url,
      template_url,
      filter_config,
      project_id,
      is_premium = false,
      location_type = 'global',
      location_value
    } = req.body;

    if (!title || !type) {
      return res.status(400).json({ error: 'Укажите название и тип челленджа' });
    }

    const challengeId = uuidv4();

    await pool.query(
      `INSERT INTO challenges (
        id, creator_id, title, description, type, duration_seconds,
        music_url, template_url, filter_config, project_id,
        is_premium, location_type, location_value
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        challengeId, req.user.id, title, description, type, duration_seconds,
        music_url, template_url, filter_config, project_id,
        is_premium, location_type, location_value
      ]
    );

    const result = await pool.query(
      `SELECT c.*, u.username as creator_username, u.avatar_url as creator_avatar
       FROM challenges c
       LEFT JOIN users u ON c.creator_id = u.id
       WHERE c.id = $1`,
      [challengeId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Ошибка создания челленджа', {
      error: error.message,
      userId: req.user.id,
    });
    res.status(500).json({ 
      error: 'Ошибка создания челленджа',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
