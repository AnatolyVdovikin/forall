import pool from '../database/connection.js';
import logger from '../utils/logger.js';

/**
 * Отправляет push-уведомление пользователю
 * В production интегрируйте с Firebase Cloud Messaging или Apple Push Notification Service
 */
export async function sendPushNotification(userId, title, body, data = {}) {
  try {
    // Получаем токены устройства пользователя
    const tokensResult = await pool.query(
      'SELECT device_token FROM user_devices WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    if (tokensResult.rows.length === 0) {
      logger.debug(`Нет активных устройств для пользователя ${userId}`);
      return { sent: 0 };
    }

    const tokens = tokensResult.rows.map(row => row.device_token);
    let sentCount = 0;

    // В production здесь будет интеграция с FCM/APNS
    // Пример для FCM:
    /*
    const admin = require('firebase-admin');
    const message = {
      notification: { title, body },
      data,
      tokens,
    };
    
    const response = await admin.messaging().sendMulticast(message);
    sentCount = response.successCount;
    */

    // Пока просто логируем
    logger.info(`Push уведомление отправлено пользователю ${userId}`, {
      title,
      body,
      tokensCount: tokens.length,
    });

    // Сохраняем уведомление в БД
    await pool.query(
      `INSERT INTO notifications (user_id, title, body, data, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [userId, title, body, JSON.stringify(data)]
    );

    return { sent: sentCount };
  } catch (error) {
    logger.error('Ошибка отправки push-уведомления', {
      error: error.message,
      userId,
    });
    throw error;
  }
}

/**
 * Отправляет уведомление о новом участнике проекта
 */
export async function notifyNewParticipant(projectId, participantUsername) {
  try {
    // Получаем создателя проекта и всех участников
    const projectResult = await pool.query(
      `SELECT p.creator_id, u.username as creator_username, p.title
       FROM projects p
       JOIN users u ON p.creator_id = u.id
       WHERE p.id = $1`,
      [projectId]
    );

    if (projectResult.rows.length === 0) return;

    const project = projectResult.rows[0];

    // Уведомляем создателя проекта
    if (project.creator_id) {
      await sendPushNotification(
        project.creator_id,
        'Новый участник!',
        `${participantUsername} присоединился к проекту "${project.title}"`,
        { type: 'new_participant', projectId }
      );
    }

    // Уведомляем других участников (опционально)
    const participantsResult = await pool.query(
      `SELECT DISTINCT user_id FROM challenge_completions 
       WHERE project_id = $1 AND user_id != $2`,
      [projectId, project.creator_id]
    );

    for (const participant of participantsResult.rows) {
      await sendPushNotification(
        participant.user_id,
        'Новый участник!',
        `${participantUsername} присоединился к проекту "${project.title}"`,
        { type: 'new_participant', projectId }
      );
    }
  } catch (error) {
    logger.error('Ошибка уведомления о новом участнике', {
      error: error.message,
      projectId,
    });
  }
}

/**
 * Отправляет уведомление о завершении проекта
 */
export async function notifyProjectCompleted(projectId) {
  try {
    const projectResult = await pool.query(
      `SELECT p.title, array_agg(DISTINCT cc.user_id) as participant_ids
       FROM projects p
       LEFT JOIN challenge_completions cc ON p.id = cc.project_id
       WHERE p.id = $1
       GROUP BY p.id, p.title`,
      [projectId]
    );

    if (projectResult.rows.length === 0) return;

    const project = projectResult.rows[0];
    const participantIds = project.participant_ids || [];

    // Уведомляем всех участников
    for (const userId of participantIds) {
      await sendPushNotification(
        userId,
        'Проект завершен!',
        `Проект "${project.title}" готов к просмотру!`,
        { type: 'project_completed', projectId }
      );
    }
  } catch (error) {
    logger.error('Ошибка уведомления о завершении проекта', {
      error: error.message,
      projectId,
    });
  }
}

/**
 * Отправляет уведомление о новом челлендже от подписок
 */
export async function notifyNewChallenge(userId, challengeTitle) {
  try {
    // Получаем подписчиков пользователя
    const followersResult = await pool.query(
      'SELECT follower_id FROM follows WHERE following_id = $1',
      [userId]
    );

    for (const follower of followersResult.rows) {
      await sendPushNotification(
        follower.follower_id,
        'Новый челлендж!',
        `${challengeTitle} - новый челлендж от вашей подписки`,
        { type: 'new_challenge', userId }
      );
    }
  } catch (error) {
    logger.error('Ошибка уведомления о новом челлендже', {
      error: error.message,
      userId,
    });
  }
}
