// src/models/OrderAddress.js
const { DataTypes } = require('sequelize');
const { db } = require('../config/database');

const Address = db.define('Address', {
    address_id: {
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
    settlement: {
        type: DataTypes.STRING(100),
    },
    region: {
        type: DataTypes.STRING(100),
    },
    postal_code: {
        type: DataTypes.STRING(20),
    },
    country: {
        type: DataTypes.STRING(100),
    },
}, {
    tableName: 'addresses',
    timestamps: false,
});

module.exports = Address;