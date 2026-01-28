import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'forall',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Увеличено для Render
});

pool.on('error', (err) => {
  console.error('Неожиданная ошибка БД:', err);
  // Не завершаем процесс при ошибке пула
});

// Тестовое подключение при старте (не блокирующее)
pool.query('SELECT NOW()').catch((err) => {
  console.warn('⚠️ Предупреждение: не удалось подключиться к БД при старте:', err.message);
  console.warn('Сервер продолжит работу, но БД может быть недоступна');
});

export default pool;
