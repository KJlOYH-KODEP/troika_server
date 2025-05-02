// src/routes/officeRoutes.js
const express = require('express');
const router = express.Router();
const OfficeController = require('../controllers/OfficeController');
const { authenticateToken, authorize} = require('../middleware/authMiddleware');

// GET /api/offices - Получить все офисы
router.get('/', authenticateToken, OfficeController.getAllOffices);

// GET /api/offices/:id - Получить офис по ID
router.get('/:id', authenticateToken, OfficeController.getOfficeById);

// POST /api/offices - Создать офис (только для админов)
router.post('/', authenticateToken, authorize(['admin']), OfficeController.createOffice);

// PUT /api/offices/:id - Обновить офис (только для админов)
router.put('/:id', authenticateToken, authorize(['admin']), OfficeController.updateOffice);

module.exports = router;