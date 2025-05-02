// src/models/Category.js
const { DataTypes } = require('sequelize');
const { db } = require('../config/database');

const Category = db.define('Category', {
    category_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    parent_category_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'categories',
            key: 'category_id',
        },
    },
}, {
    tableName: 'categories',
    timestamps: false,
});

module.exports = Category;