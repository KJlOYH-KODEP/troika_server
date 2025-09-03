// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

// Регистрация клиента
router.post('/register', AuthController.registerClient);

// Авторизация клиента
router.post('/login', AuthController.loginClient);

router.post('/staff/login', AuthController.loginStaff);

module.exports = router;