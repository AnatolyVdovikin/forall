#!/bin/bash

# Скрипт для деплоя ForAll в production

set -e

echo "🚀 Начало деплоя ForAll..."

# Проверяем наличие необходимых файлов
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Файл docker-compose.prod.yml не найден"
    exit 1
fi

if [ ! -f ".env.production" ]; then
    echo "⚠️  Файл .env.production не найден, используем .env"
    if [ ! -f ".env" ]; then
        echo "❌ Файл .env не найден"
        exit 1
    fi
fi

# Останавливаем старые контейнеры
echo "🛑 Остановка старых контейнеров..."
docker-compose -f docker-compose.prod.yml down

# Обновляем код (если используется git)
if [ -d ".git" ]; then
    echo "📥 Обновление кода из git..."
    git pull
fi

# Собираем новые образы
echo "🔨 Сборка Docker образов..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Применяем миграции БД
echo "🔄 Применение миграций БД..."
docker-compose -f docker-compose.prod.yml run --rm backend npm run migrate

# Запускаем сервисы
echo "▶️  Запуск сервисов..."
docker-compose -f docker-compose.prod.yml up -d

# Ждем пока сервисы запустятся
echo "⏳ Ожидание запуска сервисов..."
sleep 10

# Проверяем здоровье
echo "🔍 Проверка здоровья сервисов..."
./scripts/health-check.sh

echo "✅ Деплой завершен успешно!"
echo "📊 Проверьте логи: docker-compose -f docker-compose.prod.yml logs -f"
