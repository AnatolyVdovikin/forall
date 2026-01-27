import logger from './logger.js';

// Простая система метрик (в production лучше использовать Prometheus)
const metrics = {
  requests: {
    total: 0,
    errors: 0,
    byMethod: {},
    byStatus: {},
  },
  performance: {
    avgResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity,
  },
  database: {
    queries: 0,
    slowQueries: 0,
  },
};

/**
 * Обновить метрики запроса
 */
export function updateRequestMetrics(method, statusCode, duration) {
  metrics.requests.total++;
  
  if (statusCode >= 400) {
    metrics.requests.errors++;
  }

  metrics.requests.byMethod[method] = (metrics.requests.byMethod[method] || 0) + 1;
  metrics.requests.byStatus[statusCode] = (metrics.requests.byStatus[statusCode] || 0) + 1;

  // Обновляем метрики производительности
  if (duration) {
    metrics.performance.avgResponseTime = 
      (metrics.performance.avgResponseTime * (metrics.requests.total - 1) + duration) / 
      metrics.requests.total;
    
    metrics.performance.maxResponseTime = Math.max(metrics.performance.maxResponseTime, duration);
    metrics.performance.minResponseTime = Math.min(metrics.performance.minResponseTime, duration);
  }
}

/**
 * Обновить метрики БД
 */
export function updateDatabaseMetrics(duration) {
  metrics.database.queries++;
  
  if (duration > 1000) {
    metrics.database.slowQueries++;
    logger.warn('Медленный запрос к БД', { duration: `${duration}ms` });
  }
}

/**
 * Получить текущие метрики
 */
export function getMetrics() {
  return {
    ...metrics,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Сбросить метрики
 */
export function resetMetrics() {
  metrics.requests.total = 0;
  metrics.requests.errors = 0;
  metrics.requests.byMethod = {};
  metrics.requests.byStatus = {};
  metrics.performance.avgResponseTime = 0;
  metrics.performance.maxResponseTime = 0;
  metrics.performance.minResponseTime = Infinity;
  metrics.database.queries = 0;
  metrics.database.slowQueries = 0;
}

/**
 * Middleware для сбора метрик
 */
export function metricsMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    updateRequestMetrics(req.method, res.statusCode, duration);
  });

  next();
}
