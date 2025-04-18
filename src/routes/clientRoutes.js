// src/routes/clientRoutes.js
const express = require('express');
const router = express.Router();
const ClientController = require('../controllers/ClientController');

// Регистрация клиента
router.post('/register', ClientController.register);

// Аутентификация клиента
router.post('/login', ClientController.login);

module.exports = router;