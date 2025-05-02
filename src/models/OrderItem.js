// src/models/OrderItem.js
const { DataTypes } = require('sequelize');
const { db } = require('../config/database');

const OrderItem = db.define('OrderItem', {
    order_item_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    order_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'orders',
            key: 'order_id',
        },
    },
    product_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'products',
            key: 'product_id',
        },
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
}, {
    tableName: 'order_items',
    timestamps: false,
});

module.exports = OrderItem;