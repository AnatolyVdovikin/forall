import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Объединяет несколько видео в одно коллективное видео
 */
export async function mergeVideos(videoPaths, outputPath, options = {}) {
  try {
    // Проверяем наличие FFmpeg
    try {
      await execAsync('ffmpeg -version');
    } catch (error) {
      throw new Error('FFmpeg не установлен. Установите FFmpeg для обработки видео.');
    }

    // Создаем временный файл со списком видео
    const listFile = path.join(__dirname, '../../temp', `video_list_${Date.now()}.txt`);
    await fs.mkdir(path.dirname(listFile), { recursive: true });

    const listContent = videoPaths
      .map((videoPath, index) => {
        const absPath = path.isAbsolute(videoPath) 
          ? videoPath 
          : path.join(__dirname, '../../', videoPath);
        return `file '${absPath.replace(/'/g, "'\\''")}'`;
      })
      .join('\n');

    await fs.writeFile(listFile, listContent, 'utf8');

    // Параметры FFmpeg
    const {
      duration = 5, // Максимальная длительность каждого клипа в секундах
      transition = 'fade', // Тип перехода между клипами
      resolution = '720p', // Разрешение выходного видео
      fps = 30, // Кадров в секунду
    } = options;

    // Определяем разрешение
    const resolutionMap = {
      '480p': '854x480',
      '720p': '1280x720',
      '1080p': '1920x1080',
    };
    const videoSize = resolutionMap[resolution] || resolutionMap['720p'];

    // Команда FFmpeg для объединения видео
    const ffmpegCommand = [
      'ffmpeg',
      '-f', 'concat',
      '-safe', '0',
      '-i', listFile,
      '-filter_complex',
      `[0:v]scale=${videoSize}:force_original_aspect_ratio=decrease,pad=${videoSize}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps}[v]`,
      '-map', '[v]',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-t', String(duration * videoPaths.length), // Общая длительность
      '-y', // Перезаписать выходной файл
      outputPath,
    ].join(' ');

    await execAsync(ffmpegCommand);

    // Удаляем временный файл
    await fs.unlink(listFile).catch(() => {});

    return {
      success: true,
      outputPath,
      duration: duration * videoPaths.length,
    };
  } catch (error) {
    console.error('Ошибка объединения видео:', error);
    throw new Error(`Не удалось объединить видео: ${error.message}`);
  }
}

/**
 * Создает превью (thumbnail) из видео
 */
export async function generateThumbnail(videoPath, outputPath, timeOffset = 1) {
  try {
    const absVideoPath = path.isAbsolute(videoPath)
      ? videoPath
      : path.join(__dirname, '../../', videoPath);

    const absOutputPath = path.isAbsolute(outputPath)
      ? outputPath
      : path.join(__dirname, '../../', outputPath);

    await fs.mkdir(path.dirname(absOutputPath), { recursive: true });

    const command = `ffmpeg -i "${absVideoPath}" -ss ${timeOffset} -vframes 1 -q:v 2 "${absOutputPath}" -y`;

    await execAsync(command);

    return {
      success: true,
      thumbnailPath: outputPath,
    };
  } catch (error) {
    console.error('Ошибка создания превью:', error);
    throw new Error(`Не удалось создать превью: ${error.message}`);
  }
}

/**
 * Обрезает видео до указанной длительности
 */
export async function trimVideo(inputPath, outputPath, duration) {
  try {
    const absInputPath = path.isAbsolute(inputPath)
      ? inputPath
      : path.join(__dirname, '../../', inputPath);

    const absOutputPath = path.isAbsolute(outputPath)
      ? outputPath
      : path.join(__dirname, '../../', outputPath);

    await fs.mkdir(path.dirname(absOutputPath), { recursive: true });

    const command = `ffmpeg -i "${absInputPath}" -t ${duration} -c copy "${absOutputPath}" -y`;

    await execAsync(command);

    return {
      success: true,
      outputPath,
    };
  } catch (error) {
    console.error('Ошибка обрезки видео:', error);
    throw new Error(`Не удалось обрезать видео: ${error.message}`);
  }
}

/**
 * Добавляет музыку к видео
 */
export async function addMusicToVideo(videoPath, musicPath, outputPath, volume = 0.3) {
  try {
    const absVideoPath = path.isAbsolute(videoPath)
      ? videoPath
      : path.join(__dirname, '../../', videoPath);

    const absMusicPath = path.isAbsolute(musicPath)
      ? musicPath
      : path.join(__dirname, '../../', musicPath);

    const absOutputPath = path.isAbsolute(outputPath)
      ? outputPath
      : path.join(__dirname, '../../', outputPath);

    await fs.mkdir(path.dirname(absOutputPath), { recursive: true });

    const command = `ffmpeg -i "${absVideoPath}" -i "${absMusicPath}" -c:v copy -c:a aac -filter:a "volume=${volume}" -shortest "${absOutputPath}" -y`;

    await execAsync(command);

    return {
      success: true,
      outputPath,
    };
  } catch (error) {
    console.error('Ошибка добавления музыки:', error);
    throw new Error(`Не удалось добавить музыку: ${error.message}`);
  }
}

/**
 * Создает коллаж из фотографий
 */
export async function createPhotoCollage(photoPaths, outputPath, layout = 'grid') {
  try {
    // Для простоты используем ImageMagick или создаем простой коллаж через FFmpeg
    // В продакшене лучше использовать специализированные библиотеки
    
    if (photoPaths.length === 0) {
      throw new Error('Нет фотографий для коллажа');
    }

    // Создаем временный файл со списком фото
    const listFile = path.join(__dirname, '../../temp', `photo_list_${Date.now()}.txt`);
    await fs.mkdir(path.dirname(listFile), { recursive: true });

    const listContent = photoPaths
      .map((photoPath, index) => {
        const absPath = path.isAbsolute(photoPath)
          ? photoPath
          : path.join(__dirname, '../../', photoPath);
        return `file '${absPath.replace(/'/g, "'\\''")}'`;
      })
      .join('\n');

    await fs.writeFile(listFile, listContent, 'utf8');

    // Создаем слайдшоу из фотографий
    const command = `ffmpeg -f concat -safe 0 -i "${listFile}" -vf "fps=1/2,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" -t ${photoPaths.length * 2} "${outputPath}" -y`;

    await execAsync(command);

    // Удаляем временный файл
    await fs.unlink(listFile).catch(() => {});

    return {
      success: true,
      outputPath,
    };
  } catch (error) {
    console.error('Ошибка создания коллажа:', error);
    throw new Error(`Не удалось создать коллаж: ${error.message}`);
  }
}
