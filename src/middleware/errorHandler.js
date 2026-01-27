import logger from '../utils/logger.js';

/**
 * Обработчик ошибок для Express
 */
export function errorHandler(err, req, res, next) {
  // Логируем ошибку
  logger.error('Ошибка обработки запроса', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
  });

  // Определяем статус код
  const status = err.status || err.statusCode || 500;

  // Формируем ответ
  const response = {
    error: err.message || 'Внутренняя ошибка сервера',
  };

  // В development добавляем stack trace
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err;
  }

  // Специальная обработка для известных ошибок
  if (err.name === 'ValidationError') {
    response.error = 'Ошибка валидации';
    response.errors = err.errors;
  }

  if (err.name === 'UnauthorizedError') {
    response.error = 'Не авторизован';
  }

  res.status(status).json(response);
}

/**
 * Middleware для обработки 404
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Маршрут не найден',
    path: req.path,
  });
}
