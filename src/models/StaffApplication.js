// src/models/StaffApplication.js
const { DataTypes } = require('sequelize');
const { db } = require('../config/database');

const StaffApplication = db.define('StaffApplication', {
    application_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
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
    tableName: 'staff_applications',
    timestamps: false,
});

module.exports = StaffApplication;