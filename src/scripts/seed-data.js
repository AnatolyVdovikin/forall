import pool from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

async function seedData() {
  try {
    console.log('🌱 Создание тестовых данных...');

    // Создаем тестового пользователя
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash('password123', 10);

    await pool.query(
      `INSERT INTO users (id, username, email, password_hash, level, experience, coins, city, school)
       VALUES ($1, $2, $3, $4, 1, 0, 0, $5, $6)
       ON CONFLICT (username) DO NOTHING`,
      [userId, 'testuser', 'test@example.com', passwordHash, 'Москва', 'Школа №1']
    );

    console.log('✅ Тестовый пользователь создан: testuser / password123');

    // Создаем коллективный проект
    const projectId = uuidv4();
    await pool.query(
      `INSERT INTO projects (id, title, description, type, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        projectId,
        'Мега-танец 2025',
        'Соберем все танцы в один крутой проект!',
        'video',
        'collecting',
      ]
    );

    // Создаем челленджи
    const challenges = [
      {
        id: uuidv4(),
        creator_id: userId,
        title: 'Сними как ты танцуешь',
        description: 'Покажи свой лучший танец под эту музыку!',
        type: 'video',
        duration_seconds: 30,
        project_id: projectId,
        location_type: 'global',
      },
      {
        id: uuidv4(),
        creator_id: userId,
        title: 'Сделай фото с необычного ракурса',
        description: 'Прояви креативность и покажи мир с другой стороны',
        type: 'photo',
        duration_seconds: null,
        project_id: projectId,
        location_type: 'global',
      },
      {
        id: uuidv4(),
        creator_id: userId,
        title: 'Повтори этот трюк',
        description: 'Попробуй повторить трюк из примера',
        type: 'video',
        duration_seconds: 15,
        project_id: projectId,
        location_type: 'city',
        location_value: 'Москва',
      },
      {
        id: uuidv4(),
        creator_id: userId,
        title: 'Ответь на вопрос',
        description: 'Расскажи о своей мечте за 20 секунд',
        type: 'video',
        duration_seconds: 20,
        project_id: projectId,
        location_type: 'global',
      },
      {
        id: uuidv4(),
        creator_id: userId,
        title: 'Спой эту песню',
        description: 'Спой куплет из популярной песни',
        type: 'audio',
        duration_seconds: 30,
        project_id: projectId,
        location_type: 'global',
      },
    ];

    for (const challenge of challenges) {
      await pool.query(
        `INSERT INTO challenges (
          id, creator_id, title, description, type, duration_seconds,
          project_id, location_type, location_value, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
        [
          challenge.id,
          challenge.creator_id,
          challenge.title,
          challenge.description,
          challenge.type,
          challenge.duration_seconds,
          challenge.project_id,
          challenge.location_type,
          challenge.location_value || null,
        ]
      );
    }

    console.log(`✅ Создано ${challenges.length} челленджей`);
    console.log('✅ Коллективный проект создан: "Мега-танец 2025"');

    console.log('\n📝 Тестовые данные созданы успешно!');
    console.log('\nВы можете войти с:');
    console.log('  Username: testuser');
    console.log('  Password: password123');
    console.log('\nИли создать нового пользователя через API');

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка создания тестовых данных:', error);
    process.exit(1);
  }
}

seedData();
