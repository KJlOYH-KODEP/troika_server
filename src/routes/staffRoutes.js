// src/routes/staffRoutes.js
const express = require('express');
const router = express.Router();
const StaffController = require('../controllers/StaffController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// Получение списка всех сотрудников (требуется аутентификация, требуется роль admin)
router.get('/', authenticateToken, authorize(['admin']), StaffController.getAllStaff);

// Регистрация сотрудника админом
router.post('/register', authenticateToken, authorize(['admin']), StaffController.registerStaff);

// Получение сотрудника по ID (требуется аутентификация, требуется роль admin для для доступа ко всем, но свои данные доступны с любой роли)
router.get('/:staffId', authenticateToken, authorize(['admin', 'moderator', 'staff']), StaffController.getStaffById);

// Обновление роли сотрудника (требуется аутентификация, требуется роль admin)
router.delete('/:staffId', authenticateToken, authorize(['admin']), StaffController.deleteStaff);

// Обновление роли сотрудника (требуется аутентификация, требуется роль admin)
router.put('/:staffId/data', authenticateToken, authorize(['admin']), StaffController.updateStaffData); // включая роли

// Обновление учетных данных сотрудника (требуется аутентификация)
router.put('/credentials', authenticateToken, StaffController.updateCredentials);

module.exports = router;