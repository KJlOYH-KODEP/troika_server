// src/app.js
const express = require('express');
const app = express();
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const productPriceRoutes = require('./routes/productPriceRoutes');
const productInventoryRoutes = require('./routes/productInventoryRoutes');
const priceTypeRoutes = require('./routes/priceTypeRoutes');
const productSyncRoutes = require('./routes/productSyncRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const staffRoutes = require('./routes/staffRoutes');
const officeRoutes = require('./routes/officeRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const fileUpload = require('express-fileupload');
const cors = require('cors')

const allowedOrigins = [
    'https://troika-store.serveo.net',
    'http://localhost:3000',
    'http://localhost:5173',
  ];

app.use(express.json());
app.use(fileUpload());
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'))
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/product-prices', productPriceRoutes);
app.use('/api/product-inventories', productInventoryRoutes);
app.use('/api/price-types', priceTypeRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sync', productSyncRoutes);
app.use('/api/staff', staffRoutes); 
app.use('/api/offices', officeRoutes); 
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes)
app.get('/api', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

module.exports = app;