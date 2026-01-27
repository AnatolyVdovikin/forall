import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';
import { getLevelFromExperience } from '../utils/experience.js';
import { validateRegister, validateLogin } from '../middleware/validation.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Регистрация
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;

    if (!username || (!email && !phone)) {
      return res.status(400).json({ error: 'Укажите имя пользователя и email или телефон' });
    }

    if (password && password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }

    // Проверяем существование пользователя
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2 OR phone = $3',
      [username, email || null, phone || null]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким именем, email или телефоном уже существует' });
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const userId = uuidv4();

    await pool.query(
      `INSERT INTO users (id, username, email, phone, password_hash, level, experience, coins)
       VALUES ($1, $2, $3, $4, $5, 1, 0, 0)`,
      [userId, username, email || null, phone || null, passwordHash]
    );

    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: userId,
        username,
        email,
        phone,
        level: 1,
        experience: 0,
        coins: 0
      }
    });
  } catch (error) {
    logger.error('Ошибка регистрации', { error: error.message });
    res.status(500).json({ 
      error: 'Ошибка регистрации',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Вход
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, phone, password, username } = req.body;

    if (!password && !username) {
      return res.status(400).json({ error: 'Укажите email/телефон и пароль или имя пользователя' });
    }

    let user;
    
    if (username) {
      // Вход по имени пользователя (без пароля для быстрого входа)
      const result = await pool.query(
        'SELECT id, username, email, phone, password_hash, level, experience, coins, is_premium FROM users WHERE username = $1',
        [username]
      );
      user = result.rows[0];
    } else {
      // Вход по email/телефону с паролем
      const result = await pool.query(
        'SELECT id, username, email, phone, password_hash, level, experience, coins, is_premium FROM users WHERE email = $1 OR phone = $2',
        [email || null, phone || null]
      );
      user = result.rows[0];

      if (user && password) {
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
          return res.status(401).json({ error: 'Неверный пароль' });
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        level: user.level,
        experience: user.experience,
        coins: user.coins,
        is_premium: user.is_premium
      }
    });
  } catch (error) {
    logger.error('Ошибка входа', { error: error.message });
    res.status(500).json({ 
      error: 'Ошибка входа',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Получить текущего пользователя
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, phone, avatar_url, level, experience, coins, 
              city, school, is_premium, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = result.rows[0];
    const level = getLevelFromExperience(user.experience);

    res.json({
      ...user,
      level
    });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});

export default router;
