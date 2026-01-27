import express from 'express';
import pool from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Регистрировать устройство для push-уведомлений
router.post('/devices', authenticate, async (req, res) => {
  try {
    const { device_token, platform } = req.body;

    if (!device_token || !platform) {
      return res.status(400).json({ 
        error: 'Укажите device_token и platform (ios/android)' 
      });
    }

    if (!['ios', 'android'].includes(platform)) {
      return res.status(400).json({ 
        error: 'Platform должен быть ios или android' 
      });
    }

    await pool.query(
      `INSERT INTO user_devices (user_id, device_token, platform)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, device_token) 
       DO UPDATE SET is_active = true, updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, device_token, platform]
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('Ошибка регистрации устройства', {
      error: error.message,
      userId: req.user.id,
    });
    res.status(500).json({ error: 'Ошибка регистрации устройства' });
  }
});

// Получить уведомления пользователя
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0, unread_only = false } = req.query;

    let query = `
      SELECT id, title, body, data, is_read, created_at
      FROM notifications
      WHERE user_id = $1
    `;

    const params = [req.user.id];
    let paramIndex = 2;

    if (unread_only === 'true') {
      query += ` AND is_read = false`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      notifications: result.rows,
      has_more: result.rows.length === parseInt(limit),
    });
  } catch (error) {
    logger.error('Ошибка получения уведомлений', {
      error: error.message,
      userId: req.user.id,
    });
    res.status(500).json({ error: 'Ошибка получения уведомлений' });
  }
});

// Отметить уведомление как прочитанное
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('Ошибка обновления уведомления', {
      error: error.message,
      notificationId: req.params.id,
      userId: req.user.id,
    });
    res.status(500).json({ error: 'Ошибка обновления уведомления' });
  }
});

// Отметить все уведомления как прочитанные
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('Ошибка обновления всех уведомлений', {
      error: error.message,
      userId: req.user.id,
    });
    res.status(500).json({ error: 'Ошибка обновления уведомлений' });
  }
});

// Получить количество непрочитанных уведомлений
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM notifications 
       WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    logger.error('Ошибка получения количества уведомлений', {
      error: error.message,
      userId: req.user.id,
    });
    res.status(500).json({ error: 'Ошибка получения количества уведомлений' });
  }
});

export default router;
