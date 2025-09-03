// src/routes/productInventoryRoutes.js
const express = require('express');
const router = express.Router();
const ProductInventoryController = require('../controllers/ProductInventoryController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// CRUD для инвентаря

// Получение списка инвентаря (требуется аутентификация)
router.get('/', authenticateToken, authorize(['admin', 'moderator', 'staff']), ProductInventoryController.getProductInventories);

// Получение информации об инвентаре по ID (требуется аутентификация)
router.get('/:inventoryId', authenticateToken, authorize(['admin', 'moderator', 'staff']), ProductInventoryController.getProductInventoryById);

// Создание инвентаря (требуется аутентификация)
router.post('/', authenticateToken, authorize(['admin', 'moderator']), ProductInventoryController.createProductInventory);

// Обновление инвентаря (требуется аутентификация)
router.put('/:inventoryId', authenticateToken, authorize(['admin', 'moderator']), ProductInventoryController.updateProductInventory);

// Удаление записи по id (требуется аутентификация)
router.delete('/:inventoryId', authenticateToken, authorize(['admin', 'moderator']), ProductInventoryController.deleteProductInventory);

module.exports = router;