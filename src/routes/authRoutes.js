// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

router.post('/register', AuthController.registerClient);
router.post('/login', AuthController.loginClient);
router.post('/staff/login', AuthController.loginStaff);
router.post('/staff/application', AuthController.registerStaffApplication); 

module.exports = router;