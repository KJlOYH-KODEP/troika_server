// src/models/Office.js
const { DataTypes } = require('sequelize');
const { db } = require('../config/database');

const Office = db.define('Office', {
    office_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    address_line: {
        type: DataTypes.STRING(255),
    },
    settlement: {
        type: DataTypes.STRING(100),
    },
    region: {
        type: DataTypes.STRING(10),
    },
    postal_code: {
        type: DataTypes.STRING(20),
    },
    country: {
        type: DataTypes.STRING(100),
    },
    phone_number: {
        type: DataTypes.STRING(20),
    },
}, {
    tableName: 'offices',
    timestamps: false,
});

module.exports = Office;