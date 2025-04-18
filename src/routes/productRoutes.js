const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');

// Получить все товары
router.get('/', ProductController.getAllProducts);

// Получить товар по ID
router.get('/:id', ProductController.getProductById);

// Создать новый товар
router.post('/', ProductController.createProduct);

// Добавьте маршруты для обновления и удаления товаров

module.exports = router;