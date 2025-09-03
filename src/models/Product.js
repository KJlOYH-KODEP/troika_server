// src/models/Product.js
const { DataTypes } = require('sequelize');
const { db } = require('../config/database');

const Product = db.define('Product', {
    product_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    article: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    },
    category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'categories',
            key: 'category_id',
        },
    },
}, {
    tableName: 'products',
    timestamps: false,
});

module.exports = Product;