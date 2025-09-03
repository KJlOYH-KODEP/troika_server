// src/routes/officeRoutes.js
const express = require('express');
const router = express.Router();
const OfficeController = require('../controllers/OfficeController');
const { authenticateToken, authorize} = require('../middleware/authMiddleware');

// Получение списка всех офисов (требуется аутентификация)
router.get('/', authenticateToken, OfficeController.getOffices);

// Получение офиса по ID (требуется аутентификация)
router.get('/:id', authenticateToken, OfficeController.getOfficeById);

// Создание офиса (требуется аутентификация, требуется роль admin)
router.post('/', authenticateToken, authorize(['admin']), OfficeController.createOffice);

// Обновление офиса (требуется аутентификация, требуется роль admin)
router.put('/:id', authenticateToken, authorize(['admin']), OfficeController.updateOffice);

module.exports = router;