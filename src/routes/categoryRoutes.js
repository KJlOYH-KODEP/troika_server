// src/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/CategoryController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware'); // Импортируем middleware

// Получение списка категорий (требуется аутентификация)
router.get('/', authenticateToken, CategoryController.getCategories);

// Получение изображения категории (требуется аутентификация)
router.get('/image', authenticateToken, CategoryController.getCategoryImage);

// Создание категории (требуется аутентификация, требуется роль admin или moderator)
router.post('/', authenticateToken, authorize(['admin', 'moderator']), CategoryController.createCategory);

// Обновление категории (требуется аутентификация, требуется роль admin или moderator)
router.put('/:categoryId', authenticateToken, authorize(['admin', 'moderator']), CategoryController.updateCategory);

// Удаление категории (требуется аутентификация, требуется роль admin или moderator)
router.delete('/:categoryId', authenticateToken, authorize(['admin', 'moderator']), CategoryController.deleteCategory);

module.exports = router;