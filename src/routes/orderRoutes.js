// src/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/OrderController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware'); // Используем authorize

// Создание заказа (требуется аутентификация)
router.post('/', authenticateToken, OrderController.createOrder);

// Редактирование позиций заказа (требуется аутентификация)
router.put('/:orderId/items', authenticateToken, OrderController.updateOrderItems);

// Получение информации о заказе (требуется аутентификация)
router.get('/:orderId', authenticateToken, OrderController.getOrder);

// Получение списка заказов пользователя (требуется аутентификация)
router.get('/user/me', authenticateToken, OrderController.getUserOrders);

// Получение списка всех заказов (требуется аутентификация, требуется роль staff, moderator или admin)
router.get('/', authenticateToken, authorize(['staff', 'moderator', 'admin']), OrderController.getOrders);

// Получение списка всех заказов пользователя (требуется аутентификация, требуется роль staff, moderator или admin)
router.get('/user/:userId', authenticateToken, authorize(['staff', 'moderator', 'admin']), OrderController.getAllUserOrders);

// Обновление статуса заказа (требуется аутентификация, требуется роль staff, moderator или admin)
router.put('/:orderId/status', authenticateToken, authorize(['staff', 'moderator', 'admin']), OrderController.updateOrderStatus);

// Отмена заказа (требуется аутентификация)
router.put('/:orderId/cancel', authenticateToken, OrderController.cancelOrder);

module.exports = router;