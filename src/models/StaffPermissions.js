// src/models/StaffPermissions.js
const { DataTypes } = require('sequelize');
const { db } = require('../config/database');


const StaffPermissions = db.define('StaffPermissions', {
    permission_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    is_admin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    is_moderator: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    is_staff: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    tableName: 'staff_permissions',
    timestamps: false,
});

module.exports = StaffPermissions;