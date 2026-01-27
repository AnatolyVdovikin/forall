# PowerShell скрипт для автоматического деплоя на Render
# Выполните: .\deploy.ps1

Write-Host "🚀 Автоматический деплой ForAll на Render" -ForegroundColor Green
Write-Host ""

# Проверка Git
Write-Host "📦 Проверка Git репозитория..." -ForegroundColor Yellow
if (-not (Test-Path ".git")) {
    Write-Host "Инициализация Git..." -ForegroundColor Cyan
    git init
    git add .
    git commit -m "Ready for Render deployment"
    git branch -M main
    Write-Host "✅ Git инициализирован" -ForegroundColor Green
} else {
    Write-Host "✅ Git репозиторий найден" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Следующие шаги:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Создайте репозиторий на GitHub:" -ForegroundColor Cyan
Write-Host "   https://github.com/new" -ForegroundColor White
Write-Host ""
Write-Host "2. После создания выполните:" -ForegroundColor Cyan
Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/forall.git" -ForegroundColor White
Write-Host "   git push -u origin main" -ForegroundColor White
Write-Host ""
Write-Host "3. Откройте Render.com:" -ForegroundColor Cyan
Write-Host "   https://render.com" -ForegroundColor White
Write-Host ""
Write-Host "4. New → Blueprint → Выберите репозиторий → Apply" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. После деплоя в Render Shell выполните:" -ForegroundColor Cyan
Write-Host "   npm run migrate" -ForegroundColor White
Write-Host ""
Write-Host "✅ Готово! Приложение будет доступно на:" -ForegroundColor Green
Write-Host "   https://forall-backend.onrender.com" -ForegroundColor White
Write-Host ""
