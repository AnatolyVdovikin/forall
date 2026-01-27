#!/bin/bash

# Скрипт для проверки здоровья сервисов

set -e

API_URL="${API_URL:-http://localhost:3000}"
HEALTH_ENDPOINT="$API_URL/health"

echo "🔍 Проверка здоровья сервисов..."

# Проверка API
if curl -f -s "$HEALTH_ENDPOINT" > /dev/null; then
    echo "✅ API доступен"
    RESPONSE=$(curl -s "$HEALTH_ENDPOINT")
    echo "   Ответ: $RESPONSE"
else
    echo "❌ API недоступен"
    exit 1
fi

# Проверка PostgreSQL
if docker exec forall-postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL доступен"
else
    echo "❌ PostgreSQL недоступен"
    exit 1
fi

# Проверка Redis
if docker exec forall-redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis доступен"
else
    echo "❌ Redis недоступен"
    exit 1
fi

echo "✅ Все сервисы работают нормально"
