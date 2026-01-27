import logger from './logger.js';

/**
 * Middleware для измерения времени выполнения запросов
 */
export function performanceMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    };

    // Логируем медленные запросы (> 1 секунды)
    if (duration > 1000) {
      logger.warn('Медленный запрос', logData);
    } else {
      logger.debug('Запрос выполнен', logData);
    }

    // Добавляем заголовок с временем выполнения
    res.setHeader('X-Response-Time', `${duration}ms`);
  });

  next();
}

/**
 * Декоратор для измерения времени выполнения функции
 */
export function measureTime(fn, label) {
  return async (...args) => {
    const start = Date.now();
    try {
      const result = await fn(...args);
      const duration = Date.now() - start;
      logger.debug(`Выполнено: ${label}`, { duration: `${duration}ms` });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error(`Ошибка в: ${label}`, { 
        error: error.message, 
        duration: `${duration}ms` 
      });
      throw error;
    }
  };
}
