// src/routes/productSyncRoutes.js
const express = require('express');
const router = express.Router();
const ProductSynchronizationController = require('../controllers/ProductSynchronizationController');
const { authenticateToken, authorize} = require('../middleware/authMiddleware');

// Синхронизация из XML (требуется аутентификация, требуется роль admin или moderator)
router.post('/import', authenticateToken, authorize(['admin', 'moderator']), ProductSynchronizationController.importProductsFromXml);
router.get('/export', authenticateToken, authorize(['admin', 'moderator']), ProductSynchronizationController.exportProductsToXml);
// Загрузка изображения (требуется аутентификация, требуется роль admin или moderator)
router.post('/new-img-to-art/:article/:type', authenticateToken, authorize(['admin', 'moderator']), ProductSynchronizationController.uploadProductImage);

// Проверка статусов изображений (требуется аутентификация, требуется роль admin или moderator)
router.post('/img/check', authenticateToken, authorize(['admin', 'moderator']), ProductSynchronizationController.checkImagesAvailability);

// Загрузка и проверка изображений (требуется аутентификация, требуется роль admin или moderator)
router.post('/new-imgs/:type', authenticateToken, authorize(['admin', 'moderator']), ProductSynchronizationController.uploadAndCheckImages);

module.exports = router;