// src/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/CategoryController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware'); // Импортируем middleware

router.get('/', authenticateToken, CategoryController.getCategories);
router.post('/', authenticateToken, authorize(['admin', 'moderator']), CategoryController.createCategory);
router.put('/:categoryId', authenticateToken, authorize(['admin', 'moderator']), CategoryController.updateCategory);
router.delete('/:categoryId', authenticateToken, authorize(['admin', 'moderator']), CategoryController.deleteCategory);

module.exports = router;