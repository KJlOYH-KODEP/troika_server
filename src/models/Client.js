// src/models/Client.js
const { DataTypes } = require('sequelize');
const { db } = require('../config/database');

const Client = db.define('Client', {
    client_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    first_name: {
        type: DataTypes.STRING,
    },
    last_name: {
        type: DataTypes.STRING,
    },
    phone_number: {
        type: DataTypes.STRING,
    },
}, {
    tableName: 'clients',
    timestamps: false,
});

module.exports = Client;