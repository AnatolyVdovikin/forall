FROM node:18-alpine

# Устанавливаем FFmpeg для обработки видео
RUN apk add --no-cache ffmpeg

# Создаем рабочую директорию
WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Создаем необходимые директории
RUN mkdir -p uploads/video uploads/photo uploads/audio uploads/projects uploads/thumbnails logs temp

# Открываем порт
EXPOSE 3000

# Переменные окружения
ENV NODE_ENV=production
ENV PORT=3000

# Запускаем приложение
CMD ["node", "src/server.js"]
