# Инструкция по запуску ForAll

## Требования

- Node.js 18+ 
- PostgreSQL 15+
- Redis 7+
- Docker и Docker Compose (опционально, для быстрого запуска БД)

## Быстрый старт с Docker

1. Запустите PostgreSQL и Redis:
```powershell
docker-compose up -d
```

2. Установите зависимости:
```powershell
npm install
```

3. Создайте файл `.env` на основе `.env.example`:
```powershell
Copy-Item .env.example .env
```

4. Примените миграции базы данных:
```powershell
npm run migrate
```

5. Запустите сервер:
```powershell
npm run dev
```

Сервер будет доступен на `http://localhost:3000`

## Ручная настройка

### PostgreSQL

1. Создайте базу данных:
```sql
CREATE DATABASE forall;
```

2. Обновите `.env` с вашими данными БД

3. Примените миграции:
```powershell
npm run migrate
```

### Redis

Убедитесь, что Redis запущен на порту 6379 (по умолчанию).

## API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/me` - Текущий пользователь

### Челенджи
- `GET /api/challenges/swipe` - Список челленджей для свайпера
- `GET /api/challenges/:id` - Получить челлендж
- `POST /api/challenges` - Создать челлендж (требует auth)

### Проекты
- `GET /api/projects` - Список проектов
- `GET /api/projects/:id` - Получить проект
- `POST /api/projects` - Создать проект (требует auth)
- `POST /api/projects/:projectId/complete` - Выполнить челлендж
- `POST /api/projects/:id/like` - Лайкнуть проект (требует auth)

### Пользователи
- `GET /api/users/:id` - Профиль пользователя
- `PATCH /api/users/me` - Обновить профиль (требует auth)
- `GET /api/users/:id/achievements` - Достижения пользователя
- `POST /api/users/:id/follow` - Подписаться/отписаться (требует auth)

### Медиа
- `POST /api/media/video` - Загрузить видео (требует auth)
- `POST /api/media/photo` - Загрузить фото (требует auth)
- `POST /api/media/audio` - Загрузить аудио (требует auth)

## Тестирование API

### Регистрация пользователя
```powershell
$body = @{
    username = "testuser"
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method Post -Body $body -ContentType "application/json"
```

### Получить челленджи
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/challenges/swipe?limit=10" -Method Get
```

## Структура проекта

```
forall/
├── src/
│   ├── server.js           # Главный файл сервера
│   ├── database/
│   │   ├── connection.js   # Подключение к PostgreSQL
│   │   ├── schema.sql      # Схема БД
│   │   └── migrate.js      # Миграции
│   ├── routes/
│   │   ├── auth.js         # Аутентификация
│   │   ├── challenges.js   # Челенджи
│   │   ├── projects.js     # Коллективные проекты
│   │   ├── users.js        # Пользователи
│   │   └── media.js        # Загрузка медиа
│   ├── middleware/
│   │   └── auth.js         # Middleware аутентификации
│   └── utils/
│       └── experience.js   # Система уровней и опыта
├── uploads/                # Загруженные медиа файлы
├── docker-compose.yml      # Docker конфигурация
├── package.json
└── README.md
```

## Следующие шаги

1. Разработка мобильного приложения (React Native/Flutter)
2. Интеграция обработки видео (FFmpeg)
3. Система уведомлений (push notifications)
4. Аналитика и метрики
5. Монетизация (встроенные покупки)
