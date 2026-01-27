#!/bin/bash

# Скрипт для бэкапа базы данных ForAll

set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="${DB_NAME:-forall}"
DB_USER="${DB_USER:-postgres}"
CONTAINER_NAME="${CONTAINER_NAME:-forall-postgres}"

# Создаем директорию для бэкапов если не существует
mkdir -p "$BACKUP_DIR"

# Выполняем бэкап
echo "🔄 Создание бэкапа базы данных $DB_NAME..."
docker exec -T "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/forall_$DATE.sql.gz"

# Удаляем старые бэкапы (старше 30 дней)
echo "🧹 Удаление старых бэкапов..."
find "$BACKUP_DIR" -name "forall_*.sql.gz" -mtime +30 -delete

echo "✅ Бэкап создан: forall_$DATE.sql.gz"
echo "📁 Размер: $(du -h "$BACKUP_DIR/forall_$DATE.sql.gz" | cut -f1)"
