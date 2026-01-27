// Система уровней и опыта

const EXPERIENCE_PER_LEVEL = 1000;
const BASE_EXP_MULTIPLIER = 1.2;

/**
 * Вычисляет опыт, необходимый для достижения уровня
 */
export function getExperienceForLevel(level) {
  if (level <= 1) return 0;
  return Math.floor(EXPERIENCE_PER_LEVEL * Math.pow(BASE_EXP_MULTIPLIER, level - 2));
}

/**
 * Вычисляет уровень на основе опыта
 */
export function getLevelFromExperience(experience) {
  let level = 1;
  let requiredExp = 0;
  
  while (requiredExp <= experience) {
    level++;
    requiredExp = getExperienceForLevel(level);
  }
  
  return level - 1;
}

/**
 * Вычисляет прогресс до следующего уровня (0-1)
 */
export function getProgressToNextLevel(experience, currentLevel) {
  const currentLevelExp = getExperienceForLevel(currentLevel);
  const nextLevelExp = getExperienceForLevel(currentLevel + 1);
  const progress = experience - currentLevelExp;
  const total = nextLevelExp - currentLevelExp;
  
  return Math.min(1, Math.max(0, progress / total));
}

/**
 * Награды за выполнение миссии
 */
export const MISSION_REWARDS = {
  experience: 50,
  coins: 5,
  featured_bonus_experience: 200, // Если попало в финальный проект
  featured_bonus_coins: 20
};

/**
 * Награды за создание челленджа
 */
export const CHALLENGE_CREATION_REWARDS = {
  experience: 100,
  coins: 10,
  completion_bonus_experience: 5, // За каждое выполнение
  completion_bonus_coins: 1
};
