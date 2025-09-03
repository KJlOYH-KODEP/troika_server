const { DataTypes } = require('sequelize');
const { db } = require('../config/database');

const ProductInventory = db.define('ProductInventory', {
    inventory_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    quantity: {
        type: DataTypes.DECIMAL(10, 2),
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
    ordered_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    product_dates_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'product_dates',
            key: 'product_dates_id',
        },
    },
}, {
    tableName: 'product_inventory',
    timestamps: false,
});

module.exports = ProductInventory;