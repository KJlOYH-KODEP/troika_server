// src/app.js
const express = require('express');
const app = express();
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productSyncRoutes = require('./routes/productSyncRoutes');
const staffRoutes = require('./routes/staffRoutes');
const officeRoutes = require('./routes/officeRoutes');
const fileUpload = require('express-fileupload');

app.use(express.json());
app.use(fileUpload());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sync', productSyncRoutes);
app.use('/api/staff', staffRoutes); 
app.use('/api/offices', officeRoutes); 

module.exports = app;