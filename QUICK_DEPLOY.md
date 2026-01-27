# ⚡ Быстрый деплой на Render (3 шага!)

## 🎯 Самый быстрый способ запустить ForAll бесплатно

### ⚡ Автоматизация (Windows PowerShell)

Выполните в PowerShell:
```powershell
.\deploy.ps1
```

Или следуйте инструкциям ниже вручную.

### Шаг 1: GitHub (2 минуты)

```powershell
# В PowerShell
cd e:\Projects\forall
git init
git add .
git commit -m "Ready for deployment"
git branch -M main
```

**Затем:**
1. Откройте https://github.com/new
2. Создайте репозиторий `forall` (публичный)
3. Выполните команды, которые покажет GitHub:
```powershell
git remote add origin https://github.com/YOUR_USERNAME/forall.git
git push -u origin main
```

### Шаг 2: Render (2 минуты)

1. Откройте [render.com](https://render.com)
2. Нажмите **"Get Started for Free"**
3. Войдите через **GitHub**
4. Нажмите **"New +"** → **"Blueprint"**
5. Подключите ваш репозиторий `forall`
6. Render автоматически обнаружит `render.yaml`
7. Нажмите **"Apply"** ✅

**Всё!** Render создаст:
- ✅ Web Service (Backend)
- ✅ PostgreSQL Database
- ✅ Redis Cache

### Шаг 3: Миграции (1 минута)

После деплоя:

1. Откройте ваш Web Service в Render Dashboard
2. Перейдите в **"Shell"** вкладку
3. Выполните:
```bash
npm run migrate
```

## 🎉 Готово!

Ваше приложение доступно по адресу:
`https://forall-backend.onrender.com`

### Проверка:
```bash
curl https://forall-backend.onrender.com/health
```

### API:
- Регистрация: `POST https://forall-backend.onrender.com/api/auth/register`
- Челенджи: `GET https://forall-backend.onrender.com/api/challenges/swipe`

## 📱 Обновление мобильного приложения

В `mobile/src/config/api.js` измените:
```javascript
const API_BASE_URL = 'https://forall-backend.onrender.com/api';
```

## ⚠️ Важно для Render Free Tier

1. **Предотвращение "сна"**: Используйте [UptimeRobot](https://uptimerobot.com)
   - Создайте бесплатный аккаунт
   - Добавьте мониторинг: `https://your-app.onrender.com/health`
   - Интервал: 5 минут

2. **Медиа файлы**: На Free tier не персистентны
   - Для production используйте S3 или Cloudinary
   - См. инструкции в `DEPLOY_RENDER.md`

## 🆘 Проблемы?

- **Сервис не запускается**: Проверьте логи в Render Dashboard
- **БД недоступна**: Убедитесь, что используете Internal Database URL
- **Медленный первый запрос**: Нормально для Free tier (сервис просыпается)

## 📚 Подробная инструкция

См. [DEPLOY_RENDER.md](DEPLOY_RENDER.md) для детальной настройки.
