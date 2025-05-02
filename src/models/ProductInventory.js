// src/models/ProductInventory.js
const { DataTypes } = require('sequelize');
const { db } = require('../config/database');

const ProductInventory = db.define('ProductInventory', {
    inventory_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    product_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'products',
            key: 'product_id',
        },
    },
    office_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'offices',
            key: 'office_id',
        },
    },
}, {
    tableName: 'product_inventory',
    timestamps: false,
});

module.exports = ProductInventory;