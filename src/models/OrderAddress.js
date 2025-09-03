// src/models/OrderAddress.js
const { DataTypes } = require('sequelize');
const { db } = require('../config/database');

const OrderAddress = db.define('OrderAddress', {
    order_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
            model: 'orders',
            key: 'order_id',
        },
    },
    address_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'addresses',
            key: 'address_id',
        },
    },
}, {
    tableName: 'orders_addresses',
    timestamps: false,
});

module.exports = OrderAddress;