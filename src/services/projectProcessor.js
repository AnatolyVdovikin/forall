import pool from '../database/connection.js';
import { mergeVideos, generateThumbnail, createPhotoCollage } from './videoProcessor.js';
import { notifyProjectCompleted } from './pushNotifications.js';
import logger from '../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Обрабатывает коллективный проект - объединяет все медиа в финальный проект
 */
export async function processCollectiveProject(projectId) {
  try {
    // Получаем проект
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      throw new Error('Проект не найден');
    }

    const project = projectResult.rows[0];

    if (project.status !== 'collecting') {
      throw new Error('Проект уже обработан или не принимает участников');
    }

    // Обновляем статус на "обработка"
    await pool.query(
      'UPDATE projects SET status = $1 WHERE id = $2',
      ['processing', projectId]
    );

    // Получаем все выполнения для этого проекта
    const completionsResult = await pool.query(
      `SELECT cc.*, u.username 
       FROM challenge_completions cc
       JOIN users u ON cc.user_id = u.id
       WHERE cc.project_id = $1
       ORDER BY cc.created_at ASC`,
      [projectId]
    );

    const completions = completionsResult.rows;

    if (completions.length === 0) {
      await pool.query(
        'UPDATE projects SET status = $1 WHERE id = $2',
        ['collecting', projectId]
      );
      throw new Error('Нет участников в проекте');
    }

    let finalMediaUrl = null;
    let thumbnailUrl = null;

    // Обрабатываем в зависимости от типа проекта
    if (project.type === 'video') {
      // Объединяем все видео
      const videoPaths = completions
        .filter(c => c.media_type === 'video')
        .map(c => c.media_url);

      if (videoPaths.length > 0) {
        const outputFilename = `project_${projectId}_${Date.now()}.mp4`;
        const outputPath = path.join(__dirname, '../../uploads/projects', outputFilename);
        
        await mergeVideos(videoPaths, outputPath, {
          duration: 5, // Максимальная длительность каждого клипа
          resolution: '720p',
        });

        finalMediaUrl = `/uploads/projects/${outputFilename}`;

        // Создаем превью
        const thumbnailFilename = `project_${projectId}_thumb_${Date.now()}.jpg`;
        const thumbnailPath = path.join(__dirname, '../../uploads/thumbnails', thumbnailFilename);
        
        await generateThumbnail(outputPath, thumbnailPath);
        thumbnailUrl = `/uploads/thumbnails/${thumbnailFilename}`;
      }
    } else if (project.type === 'photo') {
      // Создаем коллаж из фотографий
      const photoPaths = completions
        .filter(c => c.media_type === 'photo')
        .map(c => c.media_url);

      if (photoPaths.length > 0) {
        const outputFilename = `project_${projectId}_${Date.now()}.mp4`;
        const outputPath = path.join(__dirname, '../../uploads/projects', outputFilename);
        
        await createPhotoCollage(photoPaths, outputPath);

        finalMediaUrl = `/uploads/projects/${outputFilename}`;

        // Превью из первой фотографии
        if (photoPaths.length > 0) {
          thumbnailUrl = photoPaths[0];
        }
      }
    } else if (project.type === 'audio') {
      // Для аудио просто берем первое (в будущем можно микшировать)
      if (completions.length > 0) {
        finalMediaUrl = completions[0].media_url;
      }
    }

    // Обновляем проект с финальным медиа
    await pool.query(
      `UPDATE projects 
       SET final_media_url = $1, 
           thumbnail_url = $2, 
           status = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [finalMediaUrl, thumbnailUrl, 'completed', projectId]
    );

    // Отмечаем лучшие выполнения (топ 10% по лайкам)
    const topCompletions = completions
      .sort((a, b) => b.likes_count - a.likes_count)
      .slice(0, Math.max(1, Math.floor(completions.length * 0.1)));

    for (const completion of topCompletions) {
      await pool.query(
        'UPDATE challenge_completions SET is_featured = true WHERE id = $1',
        [completion.id]
      );
    }

    // Отправляем уведомления о завершении проекта
    notifyProjectCompleted(projectId).catch(err => {
      logger.error('Ошибка отправки уведомления о завершении проекта', err);
    });

    return {
      success: true,
      projectId,
      participantsCount: completions.length,
      finalMediaUrl,
      thumbnailUrl,
    };
  } catch (error) {
    console.error('Ошибка обработки проекта:', error);
    
    // Возвращаем статус обратно на collecting при ошибке
    await pool.query(
      'UPDATE projects SET status = $1 WHERE id = $2',
      ['collecting', projectId]
    ).catch(() => {});

    throw error;
  }
}

/**
 * Автоматически обрабатывает проекты, которые готовы
 */
export async function autoProcessReadyProjects() {
  try {
    // Находим проекты, которые собирались достаточно долго или достигли лимита участников
    const projectsResult = await pool.query(
      `SELECT p.*, COUNT(cc.id) as current_participants
       FROM projects p
       LEFT JOIN challenge_completions cc ON p.id = cc.project_id
       WHERE p.status = 'collecting'
         AND (
           p.deadline IS NOT NULL AND p.deadline <= NOW()
           OR (p.max_participants IS NOT NULL AND COUNT(cc.id) >= p.max_participants)
           OR (p.deadline IS NULL AND p.max_participants IS NULL AND COUNT(cc.id) >= 10)
         )
       GROUP BY p.id
       HAVING COUNT(cc.id) > 0`
    );

    const projects = projectsResult.rows;

    for (const project of projects) {
      try {
        await processCollectiveProject(project.id);
        console.log(`✅ Проект ${project.id} обработан успешно`);
      } catch (error) {
        console.error(`❌ Ошибка обработки проекта ${project.id}:`, error.message);
      }
    }

    return {
      processed: projects.length,
    };
  } catch (error) {
    console.error('Ошибка автоматической обработки проектов:', error);
    throw error;
  }
}
