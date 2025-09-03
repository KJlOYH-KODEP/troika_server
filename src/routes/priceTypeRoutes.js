// src/routes/priceTypeRoutes.js
const express = require('express');
const router = express.Router();
const PriceTypeController = require('../controllers/PriceTypeController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// CRUD для типов цен
router.get('/', authenticateToken, authorize(['admin', 'moderator', 'staff']), PriceTypeController.getAllPriceTypes);
router.get('/client', authenticateToken, PriceTypeController.getClientPriceTypes);
router.post('/', authenticateToken, authorize(['admin', 'moderator']), PriceTypeController.createPriceType);
router.put('/:priceTypeId', authenticateToken, authorize(['admin']), PriceTypeController.updatePriceType);
router.delete('/:priceTypeId', authenticateToken, authorize(['admin']), PriceTypeController.deletePriceType);

module.exports = router;