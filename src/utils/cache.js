import { createClient } from 'redis';
import logger from './logger.js';

let redisClient = null;

// Инициализация Redis клиента
export async function initRedis() {
  // Если Redis не настроен (localhost в production), пропускаем инициализацию
  if (process.env.REDIS_HOST === 'localhost' && process.env.NODE_ENV === 'production') {
    logger.info('Redis не настроен (localhost), кэширование отключено');
    redisClient = null;
    return;
  }

  try {
    // Поддержка REDIS_URL (connectionString) или отдельных REDIS_HOST/REDIS_PORT
    let redisConfig;
    
    if (process.env.REDIS_URL) {
      // Используем connectionString из Render или другого провайдера
      redisClient = createClient({
        url: process.env.REDIS_URL,
      });
    } else {
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
      
      // Не пытаемся подключиться к localhost в production
      if (redisHost === 'localhost' && process.env.NODE_ENV === 'production') {
        logger.info('Redis не настроен (localhost), кэширование отключено');
        redisClient = null;
        return;
      }
      
      // Fallback на отдельные host/port для локальной разработки
      redisConfig = {
        socket: {
          host: redisHost,
          port: redisPort,
        },
      };
      redisClient = createClient(redisConfig);
    }

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error', { error: err.message });
    });

    redisClient.on('connect', () => {
      logger.info('Redis подключен');
    });

    await redisClient.connect();
  } catch (error) {
    logger.warn('Redis недоступен, кэширование отключено', { error: error.message });
    redisClient = null;
  }
}

// Получить значение из кэша
export async function getCache(key) {
  if (!redisClient) return null;

  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Ошибка получения из кэша', { key, error: error.message });
    return null;
  }
}

// Установить значение в кэш
export async function setCache(key, value, ttl = 3600) {
  if (!redisClient) return false;

  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error('Ошибка установки кэша', { key, error: error.message });
    return false;
  }
}

// Удалить значение из кэша
export async function deleteCache(key) {
  if (!redisClient) return false;

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error('Ошибка удаления из кэша', { key, error: error.message });
    return false;
  }
}

// Удалить все ключи по паттерну
export async function deleteCachePattern(pattern) {
  if (!redisClient) return false;

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    logger.error('Ошибка удаления паттерна из кэша', { pattern, error: error.message });
    return false;
  }
}

// Middleware для кэширования ответов
export function cacheMiddleware(ttl = 300) {
  return async (req, res, next) => {
    // Кэшируем только GET запросы
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `cache:${req.originalUrl}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      logger.debug('Cache hit', { key: cacheKey });
      return res.json(cached);
    }

    // Сохраняем оригинальный json метод
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      setCache(cacheKey, data, ttl).catch(() => {});
      return originalJson(data);
    };

    next();
  };
}

export default {
  initRedis,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  cacheMiddleware,
};
