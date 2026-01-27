import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Utils
import logger from './utils/logger.js';
import { initRedis } from './utils/cache.js';

// Routes
import authRoutes from './routes/auth.js';
import challengeRoutes from './routes/challenges.js';
import projectRoutes from './routes/projects.js';
import userRoutes from './routes/users.js';
import mediaRoutes from './routes/media.js';
import notificationRoutes from './routes/notifications.js';

// Jobs
import { startProjectProcessorJob } from './jobs/projectProcessor.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  }
});

const PORT = process.env.PORT || process.env.RENDER_PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
if (NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));
}

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: NODE_ENV === 'production' ? 100 : 1000, // лимит запросов
  message: 'Слишком много запросов, попробуйте позже',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging и метрики
import { performanceMiddleware } from './utils/performance.js';
import { metricsMiddleware } from './utils/metrics.js';

app.use(performanceMiddleware);
app.use(metricsMiddleware);

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Static files for media
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// Health check (до других routes)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
  });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  const { getMetrics } = await import('./utils/metrics.js');
  res.json(getMetrics());
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/notifications', notificationRoutes);

// WebSocket для real-time обновлений коллективных проектов
io.on('connection', (socket) => {
  logger.info('WebSocket client connected', { socketId: socket.id });

  socket.on('join-project', (projectId) => {
    socket.join(`project:${projectId}`);
    logger.debug('Client joined project', { socketId: socket.id, projectId });
  });

  socket.on('disconnect', () => {
    logger.info('WebSocket client disconnected', { socketId: socket.id });
  });
});

// Export io для использования в роутах
app.set('io', io);


// Error handler
app.use((err, req, res, next) => {
  logger.error('Ошибка обработки запроса', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({ 
    error: NODE_ENV === 'production' 
      ? 'Что-то пошло не так' 
      : err.message,
    ...(NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Инициализация сервисов
async function initialize() {
  // Инициализируем Redis
  await initRedis();

  // Запускаем job обработки проектов
  if (NODE_ENV === 'production') {
    startProjectProcessorJob();
  }

  // Запускаем сервер
  httpServer.listen(PORT, () => {
    logger.info(`🚀 ForAll сервер запущен на порту ${PORT}`);
    logger.info(`📱 Режим: ${NODE_ENV}`);
    logger.info(`🌍 CORS origin: ${process.env.CORS_ORIGIN || '*'}`);
  });
}

// Обработка ошибок при запуске
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM получен, завершаем работу...');
  httpServer.close(() => {
    logger.info('HTTP сервер закрыт');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT получен, завершаем работу...');
  httpServer.close(() => {
    logger.info('HTTP сервер закрыт');
    process.exit(0);
  });
});

// Запускаем инициализацию
initialize().catch((error) => {
  logger.error('Ошибка инициализации сервера', { error: error.message, stack: error.stack });
  process.exit(1);
});

export { io };
