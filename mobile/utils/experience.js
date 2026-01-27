// Система уровней и опыта (копия из backend для фронтенда)

const EXPERIENCE_PER_LEVEL = 1000;
const BASE_EXP_MULTIPLIER = 1.2;

export function getExperienceForLevel(level) {
  if (level <= 1) return 0;
  return Math.floor(EXPERIENCE_PER_LEVEL * Math.pow(BASE_EXP_MULTIPLIER, level - 2));
}

export function getLevelFromExperience(experience) {
  let level = 1;
  let requiredExp = 0;
  
  while (requiredExp <= experience) {
    level++;
    requiredExp = getExperienceForLevel(level);
  }
  
  return level - 1;
}

export function getProgressToNextLevel(experience, currentLevel) {
  const currentLevelExp = getExperienceForLevel(currentLevel);
  const nextLevelExp = getExperienceForLevel(currentLevel + 1);
  const progress = experience - currentLevelExp;
  const total = nextLevelExp - currentLevelExp;
  
  return Math.min(1, Math.max(0, progress / total));
}
