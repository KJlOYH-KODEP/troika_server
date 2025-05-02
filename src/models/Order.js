// src/models/Order.js
const { DataTypes } = require('sequelize');
const { db } = require('../config/database');

const Order = db.define('Order', {
    order_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    order_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    status: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
    },
    delivery_method: {
        type: DataTypes.STRING(50),
    },
    payment_method: {
        type: DataTypes.STRING(50),
    },
    comment: {
        type: DataTypes.TEXT,
    },
}, {
    tableName: 'orders',
    timestamps: false,
});

module.exports = Order;