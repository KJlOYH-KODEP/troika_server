// src/models/PriceType.js
const { DataTypes } = require('sequelize');
const { db } = require('../config/database');

const PriceType = db.define('PriceType', {
    price_type_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    },
}, {
    tableName: 'price_types',
    timestamps: false,
});

module.exports = PriceType;