// src/models/OrderAddress.js
const { DataTypes } = require('sequelize');
const { db } = require('../config/database');

const OrderAddress = db.define('OrderAddress', {
    order_address_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    address_line1: {
        type: DataTypes.STRING(255),
    },
    address_line2: {
        type: DataTypes.STRING(255),
    },
    city: {
        type: DataTypes.STRING(100),
    },
    state: {
        type: DataTypes.STRING(100),
    },
    postal_code: {
        type: DataTypes.STRING(20),
    },
    country: {
        type: DataTypes.STRING(100),
    },
    order_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'orders',
            key: 'order_id',
        },
    },
}, {
    tableName: 'order_addresses',
    timestamps: false,
});

module.exports = OrderAddress;