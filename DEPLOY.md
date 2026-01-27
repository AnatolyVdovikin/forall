# Инструкция по деплою ForAll в Production

## Предварительные требования

- Docker и Docker Compose
- Сервер с минимум 2GB RAM
- Домен (опционально, для SSL)

## Шаг 1: Подготовка сервера

1. Установите Docker и Docker Compose:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

2. Клонируйте репозиторий:
```bash
git clone <your-repo-url> forall
cd forall
```

## Шаг 2: Настройка переменных окружения

Создайте файл `.env.production`:

```env
# Database
DB_PASSWORD=your_strong_password_here

# JWT
JWT_SECRET=your_very_long_random_secret_key_here

# CORS (укажите ваш домен)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Environment
NODE_ENV=production
LOG_LEVEL=info
```

## Шаг 3: Запуск в Production

1. Примените миграции БД:
```bash
docker-compose -f docker-compose.prod.yml run --rm backend npm run migrate
```

2. (Опционально) Создайте тестовые данные:
```bash
docker-compose -f docker-compose.prod.yml run --rm backend npm run seed
```

3. Запустите все сервисы:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

4. Проверьте статус:
```bash
docker-compose -f docker-compose.prod.yml ps
```

5. Проверьте логи:
```bash
docker-compose -f docker-compose.prod.yml logs -f backend
```

## Шаг 4: Настройка SSL (Let's Encrypt)

1. Установите Certbot:
```bash
sudo apt-get update
sudo apt-get install certbot
```

2. Получите сертификат:
```bash
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

3. Скопируйте сертификаты:
```bash
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
sudo chmod 644 nginx/ssl/cert.pem
sudo chmod 600 nginx/ssl/key.pem
```

4. Раскомментируйте HTTPS секцию в `nginx/nginx.conf`

5. Перезапустите Nginx:
```bash
docker-compose -f docker-compose.prod.yml restart nginx
```

## Шаг 5: Настройка автообновления сертификатов

Создайте cron job:
```bash
sudo crontab -e
```

Добавьте:
```
0 0 * * * certbot renew --quiet && docker-compose -f /path/to/forall/docker-compose.prod.yml restart nginx
```

## Шаг 6: Мониторинг

### Проверка здоровья сервисов:
```bash
curl http://yourdomain.com/health
```

### Просмотр логов:
```bash
# Backend логи
docker-compose -f docker-compose.prod.yml logs -f backend

# Nginx логи
docker-compose -f docker-compose.prod.yml logs -f nginx

# Все логи
docker-compose -f docker-compose.prod.yml logs -f
```

### Мониторинг ресурсов:
```bash
docker stats
```

## Шаг 7: Backup базы данных

Создайте скрипт `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres forall > "$BACKUP_DIR/forall_$DATE.sql"
```

Добавьте в cron для ежедневного бэкапа:
```
0 2 * * * /path/to/backup.sh
```

## Шаг 8: Обновление приложения

1. Остановите сервисы:
```bash
docker-compose -f docker-compose.prod.yml down
```

2. Обновите код:
```bash
git pull
```

3. Пересоберите образы:
```bash
docker-compose -f docker-compose.prod.yml build
```

4. Примените миграции (если есть):
```bash
docker-compose -f docker-compose.prod.yml run --rm backend npm run migrate
```

5. Запустите сервисы:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Проблемы с памятью
Если серверу не хватает памяти, увеличьте лимиты в `docker-compose.prod.yml`:
```yaml
services:
  backend:
    mem_limit: 1g
    memswap_limit: 1g
```

### Проблемы с дисковым пространством
Очистите неиспользуемые Docker ресурсы:
```bash
docker system prune -a --volumes
```

### Проблемы с производительностью
- Увеличьте количество воркеров Nginx в `nginx/nginx.conf`
- Настройте connection pooling в PostgreSQL
- Используйте Redis для кэширования

## Безопасность

1. **Firewall**: Настройте firewall для открытия только необходимых портов (80, 443)
2. **SSH**: Используйте ключи вместо паролей
3. **Обновления**: Регулярно обновляйте систему и Docker образы
4. **Мониторинг**: Настройте алерты на критические ошибки
5. **Backup**: Регулярно делайте бэкапы БД

## Масштабирование

Для горизонтального масштабирования:

1. Используйте внешний PostgreSQL (RDS, Cloud SQL)
2. Используйте внешний Redis (ElastiCache, Redis Cloud)
3. Используйте S3/MinIO для хранения медиа
4. Настройте load balancer перед несколькими инстансами backend
