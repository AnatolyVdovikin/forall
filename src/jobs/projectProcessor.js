import cron from 'node-cron';
import { autoProcessReadyProjects } from '../services/projectProcessor.js';

/**
 * Запускает автоматическую обработку проектов каждые 5 минут
 */
export function startProjectProcessorJob() {
  // Запускаем каждые 5 минут
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('🔄 Автоматическая обработка проектов...');
      const result = await autoProcessReadyProjects();
      if (result.processed > 0) {
        console.log(`✅ Обработано проектов: ${result.processed}`);
      }
    } catch (error) {
      console.error('❌ Ошибка автоматической обработки:', error);
    }
  });

  console.log('✅ Job обработки проектов запущен (каждые 5 минут)');
}
