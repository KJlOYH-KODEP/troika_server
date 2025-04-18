// src/app.js
const express = require('express');
const app = express();

// Middleware (например, для обработки JSON)
app.use(express.json());

// Подключение маршрутов
const productRoutes = require('./routes/productRoutes');
const clientRoutes = require('./routes/clientRoutes');
const staffRoutes = require('./routes/staffRoutes');

app.use('/products', productRoutes);
app.use('/clients', clientRoutes); // Подключаем маршруты для клиентов
app.use('/staff', staffRoutes);   // Подключаем маршруты для персонала

module.exports = app;