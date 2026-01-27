#!/bin/bash

# Скрипт для восстановления базы данных ForAll

set -e

if [ -z "$1" ]; then
    echo "❌ Укажите файл бэкапа для восстановления"
    echo "Использование: $0 <backup_file.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"
DB_NAME="${DB_NAME:-forall}"
DB_USER="${DB_USER:-postgres}"
CONTAINER_NAME="${CONTAINER_NAME:-forall-postgres}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Файл бэкапа не найден: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  ВНИМАНИЕ: Это действие перезапишет текущую базу данных!"
read -p "Вы уверены? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Восстановление отменено"
    exit 1
fi

echo "🔄 Восстановление базы данных из $BACKUP_FILE..."

# Распаковываем и восстанавливаем
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"

echo "✅ База данных восстановлена успешно"
