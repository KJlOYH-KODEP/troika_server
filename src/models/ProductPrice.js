const { DataTypes } = require('sequelize');
const { db } = require('../config/database');

const ProductPrice = db.define('ProductPrice', {
    product_price_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    price: {
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
    price_type_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'price_types',
            key: 'price_type_id',
        },
    },
    product_dates_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'product_dates',
            key: 'product_dates_id',
        },
    },
}, {
    tableName: 'product_prices',
    timestamps: false,
});

module.exports = ProductPrice;