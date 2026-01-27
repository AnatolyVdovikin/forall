import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🔄 Применение миграций...');
    await pool.query(schema);
    console.log('✅ Миграции применены успешно');
    
    // Добавляем начальные данные
    await seedInitialData();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    process.exit(1);
  }
}

async function seedInitialData() {
  try {
    console.log('🌱 Заполнение начальных данных...');
    
    // Добавляем базовые достижения
    const achievements = [
      {
        code: 'first_mission',
        title: 'Первая миссия',
        description: 'Выполни свою первую миссию',
        reward_coins: 10,
        reward_experience: 50
      },
      {
        code: 'week_streak',
        title: 'Неделя активности',
        description: 'Выполняй миссии 7 дней подряд',
        reward_coins: 100,
        reward_experience: 500
      },
      {
        code: 'trend_creator',
        title: 'Творец трендов',
        description: 'Создай челлендж, который выполнили 1000+ человек',
        reward_coins: 500,
        reward_experience: 2000
      },
      {
        code: 'collective_heart',
        title: 'Сердце коллектива',
        description: 'Твой контент попал в топ проекта',
        reward_coins: 50,
        reward_experience: 200
      },
      {
        code: 'level_10',
        title: 'Активный участник',
        description: 'Достигни 10 уровня',
        reward_coins: 200,
        reward_experience: 1000
      }
    ];

    for (const achievement of achievements) {
      await pool.query(
        `INSERT INTO achievements (code, title, description, reward_coins, reward_experience)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (code) DO NOTHING`,
        [achievement.code, achievement.title, achievement.description, 
         achievement.reward_coins, achievement.reward_experience]
      );
    }
    
    console.log('✅ Начальные данные добавлены');
  } catch (error) {
    console.error('⚠️ Ошибка заполнения данных:', error.message);
  }
}

migrate();
