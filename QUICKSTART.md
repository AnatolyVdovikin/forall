# Быстрый старт ForAll

## Предварительные требования

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker и Docker Compose (опционально)
- Expo CLI для мобильного приложения

## Шаг 1: Запуск Backend

1. Перейдите в корневую директорию проекта:
```bash
cd /path/to/forall
```

2. Установите зависимости:
```bash
npm install
```

3. Запустите PostgreSQL и Redis через Docker:
```bash
docker-compose up -d
```

Или установите их локально и настройте в `.env`

4. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

5. Обновите `.env` с вашими настройками БД

6. Примените миграции:
```bash
npm run migrate
```

7. Запустите сервер:
```bash
npm run dev
```

Backend будет доступен на `http://localhost:3000`

## Шаг 2: Запуск Mobile App

1. Перейдите в директорию mobile:
```bash
cd mobile
```

2. Установите зависимости:
```bash
npm install
```

3. Настройте API URL в `src/config/api.js`:
   - Замените `192.168.1.100` на ваш локальный IP адрес
   - Или используйте адрес вашего production сервера

4. Запустите приложение:
```bash
npm start
```

5. Отсканируйте QR-код в приложении Expo Go или запустите на эмуляторе:
   - Android: `npm run android`
   - iOS: `npm run ios`

## Тестирование

### Backend API

Проверьте health endpoint:
```bash
curl http://localhost:3000/health
```

### Регистрация пользователя:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

### Получить челленджи:
```bash
curl http://localhost:3000/api/challenges/swipe?limit=10
```

## Структура проекта

```
forall/
├── src/                    # Backend код
│   ├── server.js          # Главный сервер
│   ├── routes/            # API роуты
│   ├── database/          # БД схемы и миграции
│   ├── middleware/        # Express middleware
│   └── utils/             # Утилиты
├── mobile/                # React Native приложение
│   ├── src/
│   │   ├── screens/      # Экраны
│   │   ├── context/      # React Context
│   │   └── config/       # Конфигурация
│   └── App.js            # Главный файл
├── docker-compose.yml     # Docker конфигурация
└── package.json          # Backend зависимости
```

## Следующие шаги

1. Создайте тестовые данные (челленджи и проекты)
2. Протестируйте все функции приложения
3. Настройте обработку видео для коллективных проектов
4. Добавьте push-уведомления
5. Подготовьте к production деплою

## Troubleshooting

### Backend не запускается
- Проверьте, что PostgreSQL и Redis запущены
- Убедитесь, что порты 3000, 5432, 6379 свободны
- Проверьте настройки в `.env`

### Mobile app не подключается к API
- Проверьте IP адрес в `mobile/src/config/api.js`
- Убедитесь, что backend запущен
- Проверьте firewall настройки

### Ошибки миграций
- Убедитесь, что PostgreSQL запущен
- Проверьте права доступа к БД
- Попробуйте удалить и пересоздать БД
