const { DataTypes } = require('sequelize');
const { db } = require('../config/database');

const ProductDates = db.define('ProductDates', {
    product_dates_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    data_s: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    data_e: {
        type: DataTypes.DATE,
        allowNull: false,
    },
}, {
    tableName: 'product_dates',
    timestamps: false,
});

module.exports = ProductDates;