// src/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, ProductController.getProducts);
router.get('/:productId',authenticateToken, ProductController.getProductById);
router.post('/', authenticateToken, authorize(['admin', 'moderator']), ProductController.createProduct);
router.put('/:productId', authenticateToken, authorize(['admin', 'moderator']), ProductController.updateProduct);
router.delete('/:productId', authenticateToken, authorize(['admin', 'moderator']), ProductController.deleteProduct);

// // Получение информации о количестве товаров на складе (с указанием office_id)
// router.get('/:productId/inventory', authenticateToken, ProductController.getProductInventory);

// // Обновление количества товаров на складе (с указанием office_id)
// router.put('/:productId/inventory', authenticateToken, authorize(['admin', 'moderator']), ProductController.updateProductInventory);

// // Получение информации о цене товара (с указанием office_id)
// router.get('/:productId/price', authenticateToken, ProductController.getProductPrice);

// // Обновление цены товара (с указанием office_id)
// router.put('/:productId/price', authenticateToken, authorize(['admin', 'moderator']), ProductController.updateProductPrice);

module.exports = router;