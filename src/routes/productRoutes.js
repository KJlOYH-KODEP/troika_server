// src/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');


// GET /api/products/low-stock?officeId=1 - Get top 10 low stock products for a specific office
router.get('/low-stock', authenticateToken, authorize(['staff', 'moderator', 'admin']), ProductController.getLowStockProducts);

router.get('/', authenticateToken, authorize(['admin', 'moderator', 'staff']),  ProductController.getProducts);
router.get('/count', authenticateToken, authorize(['admin', 'moderator']), ProductController.getProductsCount);
router.get('/clients', authenticateToken, ProductController.getProductsForClient)
// router.get('/find', authenticateToken, ProductController.findProducts)
// router.get('/by-category', authenticateToken, ProductController.getProductsByCategory);

// POST /api/products/images - Get product images by IDs
router.get('/images', authenticateToken, ProductController.getProductsImages)

// GET /api/products/:productId - Get product by ID
router.get('/:productId', authenticateToken, ProductController.getProductById);

// PUT /api/products/:productId - Update product information
router.put('/:productId', authenticateToken, authorize(['staff', 'moderator', 'admin']), ProductController.updateProduct);

// DELETE /api/products/:productId - Delete product (admin only)
router.delete('/:productId', authenticateToken, authorize(['admin']), ProductController.deleteProduct);

// DELETE /api/products/:productId/office/:officeId - Delete product from office
router.delete('/:productId/office/:officeId', authenticateToken, authorize(['admin', 'moderator']), ProductController.deleteProductFromOffice);


module.exports = router;