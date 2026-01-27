import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Создаем директорию для загрузок
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const typeDir = path.join(uploadsDir, file.fieldname); // 'video', 'photo', 'audio'
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }
    cb(null, typeDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = {
      video: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
      photo: ['image/jpeg', 'image/png', 'image/webp'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
    };

    const allowed = allowedTypes[file.fieldname] || [];
    if (allowed.length === 0 || allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Неподдерживаемый тип файла для ${file.fieldname}`));
    }
  }
});

// Загрузка видео
router.post('/video', authenticate, upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' });
  }

  const mediaUrl = `/uploads/video/${req.file.filename}`;
  res.json({
    url: mediaUrl,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

// Загрузка фото
router.post('/photo', authenticate, upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' });
  }

  const mediaUrl = `/uploads/photo/${req.file.filename}`;
  res.json({
    url: mediaUrl,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

// Загрузка аудио
router.post('/audio', authenticate, upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' });
  }

  const mediaUrl = `/uploads/audio/${req.file.filename}`;
  res.json({
    url: mediaUrl,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

export default router;
