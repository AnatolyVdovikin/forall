# Примеры API запросов

## Аутентификация

### Регистрация
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Вход
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### Получить текущего пользователя
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Челенджи

### Получить список челленджей для свайпера
```bash
curl http://localhost:3000/api/challenges/swipe?limit=10&offset=0
```

### Получить один челлендж
```bash
curl http://localhost:3000/api/challenges/CHALLENGE_ID
```

### Создать челлендж
```bash
curl -X POST http://localhost:3000/api/challenges \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Сними как ты танцуешь",
    "description": "Покажи свой лучший танец!",
    "type": "video",
    "duration_seconds": 30,
    "project_id": "PROJECT_ID",
    "location_type": "global"
  }'
```

## Проекты

### Получить список проектов
```bash
curl http://localhost:3000/api/projects?limit=20&sort=popular
```

### Получить один проект
```bash
curl http://localhost:3000/api/projects/PROJECT_ID
```

### Создать проект
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Мега-танец 2025",
    "description": "Соберем все танцы в один проект!",
    "type": "video",
    "challenge_id": "CHALLENGE_ID"
  }'
```

### Выполнить челлендж (добавить в проект)
```bash
curl -X POST http://localhost:3000/api/projects/PROJECT_ID/complete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "challengeId": "CHALLENGE_ID",
    "mediaUrl": "/uploads/video/filename.mp4",
    "mediaType": "video",
    "durationSeconds": 30
  }'
```

### Лайкнуть проект
```bash
curl -X POST http://localhost:3000/api/projects/PROJECT_ID/like \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Пользователи

### Получить профиль пользователя
```bash
curl http://localhost:3000/api/users/USER_ID
```

### Обновить профиль
```bash
curl -X PATCH http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Москва",
    "school": "Школа №1"
  }'
```

### Получить достижения пользователя
```bash
curl http://localhost:3000/api/users/USER_ID/achievements
```

### Подписаться/отписаться
```bash
curl -X POST http://localhost:3000/api/users/USER_ID/follow \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Медиа

### Загрузить видео
```bash
curl -X POST http://localhost:3000/api/media/video \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video=@/path/to/video.mp4"
```

### Загрузить фото
```bash
curl -X POST http://localhost:3000/api/media/photo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "photo=@/path/to/photo.jpg"
```

### Загрузить аудио
```bash
curl -X POST http://localhost:3000/api/media/audio \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audio=@/path/to/audio.mp3"
```

## Health Check

```bash
curl http://localhost:3000/health
```

## Примеры с использованием JavaScript (fetch)

```javascript
// Регистрация
const register = async () => {
  const response = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    }),
  });
  const data = await response.json();
  console.log('Token:', data.token);
  return data;
};

// Получить челленджи
const getChallenges = async (token) => {
  const response = await fetch('http://localhost:3000/api/challenges/swipe?limit=10', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  const data = await response.json();
  return data.challenges;
};

// Выполнить челлендж
const completeChallenge = async (token, projectId, challengeId, mediaUrl) => {
  const response = await fetch(`http://localhost:3000/api/projects/${projectId}/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      challengeId,
      mediaUrl,
      mediaType: 'video',
      durationSeconds: 30,
    }),
  });
  const data = await response.json();
  console.log('Reward:', data.reward);
  return data;
};
```
