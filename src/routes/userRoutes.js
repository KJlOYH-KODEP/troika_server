const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// Получить с поиском многих
router.get('/', authenticateToken, authorize(['staff', 'moderator', 'admin']), UserController.getUsers);

// Обновление учетных данных пользователя (требуется аутентификация)
router.put('/credentials', authenticateToken, UserController.updateCredentials);

// Получить одного по id
router.get('/:userId', authenticateToken, UserController.getUser);

module.exports = router;