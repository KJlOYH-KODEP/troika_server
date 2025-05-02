// src/routes/productSyncRoutes.js
const express = require('express');
const router = express.Router();
const ProductSynchronizationController = require('../controllers/ProductSynchronizationController');
const { authenticateToken, authorize} = require('../middleware/authMiddleware');

router.post('/xml', authenticateToken, authorize(['admin', 'moderator']), ProductSynchronizationController.syncProductsFromXml); // Синхронизация из XML
router.post('/image/:article/:type', authenticateToken, authorize(['admin', 'moderator']), ProductSynchronizationController.uploadProductImage);  // Загрузка изображения
router.post('/image/check', authenticateToken, authorize(['admin', 'moderator']), ProductSynchronizationController.setImageStatuses); // Проверка статусов изображений

module.exports = router;