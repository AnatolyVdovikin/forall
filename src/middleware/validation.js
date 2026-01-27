import { body, param, query, validationResult } from 'express-validator';

export const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({ 
      error: 'Ошибка валидации',
      errors: errors.array(),
    });
  };
};

// Валидация регистрации
export const validateRegister = validate([
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Имя пользователя должно быть от 3 до 50 символов')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Имя пользователя может содержать только буквы, цифры и _'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Неверный формат email'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Пароль должен быть не менее 6 символов'),
]);

// Валидация входа
export const validateLogin = validate([
  body('username')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Укажите имя пользователя'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Неверный формат email'),
  body('password')
    .optional()
    .notEmpty()
    .withMessage('Укажите пароль'),
]);

// Валидация создания челленджа
export const validateChallenge = validate([
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Название должно быть от 3 до 200 символов'),
  body('type')
    .isIn(['video', 'photo', 'audio', 'text'])
    .withMessage('Неверный тип челленджа'),
  body('duration_seconds')
    .optional()
    .isInt({ min: 1, max: 300 })
    .withMessage('Длительность должна быть от 1 до 300 секунд'),
]);

// Валидация создания проекта
export const validateProject = validate([
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Название должно быть от 3 до 200 символов'),
  body('type')
    .isIn(['video', 'photo', 'audio', 'mixed'])
    .withMessage('Неверный тип проекта'),
]);

// Валидация UUID параметров
export const validateUUID = validate([
  param('id').isUUID().withMessage('Неверный формат ID'),
]);
