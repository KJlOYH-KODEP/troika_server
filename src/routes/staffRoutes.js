// src/routes/staffRoutes.js
const express = require('express');
const router = express.Router();
const StaffController = require('../controllers/StaffController');

// Регистрация персонала
router.post('/register', StaffController.register);

// Аутентификация персонала
router.post('/login', StaffController.login);

module.exports = router;