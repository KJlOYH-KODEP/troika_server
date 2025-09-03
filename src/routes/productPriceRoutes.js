// src/routes/productPriceRoutes.js
const express = require('express');
const router = express.Router();
const ProductPriceController = require('../controllers/ProductPriceController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// CRUD для цен

// Получение списка цен (требуется аутентификация)
router.get('/', authenticateToken, authorize(['admin', 'moderator', 'staff']), ProductPriceController.getProductPrices);    

// Получение информации о цене по ID (требуется аутентификация)
router.get('/:productPriceId', authenticateToken, authorize(['admin', 'moderator', 'staff']), ProductPriceController.getProductPriceById);

// Создание цены (требуется аутентификация)
router.post('/', authenticateToken, authorize(['admin', 'moderator']), ProductPriceController.createProductPrice);

// Обновление цены (требуется аутентификация)
router.put('/:productPriceId', authenticateToken, authorize(['admin', 'moderator']), ProductPriceController.updateProductPrice);

// Удаление цены (требуется аутентификация)
router.delete('/:productPriceId', authenticateToken, authorize(['admin']), ProductPriceController.deleteProductPrice);

module.exports = router;