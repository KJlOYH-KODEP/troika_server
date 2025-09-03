// src/controllers/PriceTypeController.js
const { PriceType } = require('../models');
const { Op } = require('sequelize');

class PriceTypeController {
    static async getAllPriceTypes(req, res) {
        try {
            const priceTypes = await PriceType.findAll();
            res.status(200).json(priceTypes);
        } catch (error) {
            console.error("Ошибка при получении списка типов цен:", error);
            res.status(500).json({ message: 'Ошибка сервера при получении типов цен.', error: error.message });
        }
    }

    static async getClientPriceTypes(req, res) {
        try {
            const priceTypes = await PriceType.findAll({
                where: {
                    name: {
                        [Op.iLike]: 'розничн%'
                    }
                },
                order: [['name', 'ASC']]
            });
    
            if (!priceTypes || priceTypes.length === 0) {
                return res.status(404).json({ 
                    message: 'Розничные типы цен не найдены',
                    suggestion: 'Пожалуйста, обратитесь к администратору'
                });
            }
    
            res.status(200).json(priceTypes);
        } catch (error) {
            console.error("Ошибка при получении списка типов цен:", error);
            res.status(500).json({ 
                message: 'Ошибка сервера при получении типов цен',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    static async createPriceType(req, res) {
        const { name } = req.body;
        try {
            const priceType = await PriceType.create({ name });
            res.status(201).json(priceType);
        } catch (error) {
            console.error("Ошибка при создании типа цены:", error);
            res.status(500).json({ message: 'Ошибка сервера при создании типа цены.', error: error.message });
        }
    }

    static async updatePriceType(req, res) {
        const { priceTypeId } = req.params;
        const { name } = req.body;
        try {
            const priceType = await PriceType.findByPk(priceTypeId);
            if (!priceType) return res.status(404).json({ message: 'Тип цены не найден.' });
            priceType.name = name;
            await priceType.save();
            res.status(200).json({ message: 'Тип цены обновлен.', priceType });
        } catch (error) {
            console.error("Ошибка при обновлении типа цены:", error);
            res.status(500).json({ message: 'Ошибка сервера при обновлении типа цены.', error: error.message });
        }
    }

    static async deletePriceType(req, res) {
        const { priceTypeId } = req.params;
        try {
            const priceType = await PriceType.findByPk(priceTypeId);
            if (!priceType) return res.status(404).json({ message: 'Тип цены не найден.' });
            await priceType.destroy();
            res.status(200).json({ message: 'Тип цены удален.' });
        } catch (error) {
            console.error("Ошибка при удалении типа цены:", error);
            res.status(500).json({ message: 'Ошибка сервера при удалении типа цены.', error: error.message });
        }
    }
}

module.exports = PriceTypeController;