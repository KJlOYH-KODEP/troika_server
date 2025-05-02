// src/controllers/ProductController.js
const { Op } = require('sequelize');
const Product = require('../models/Product');
const ProductPrice = require('../models/ProductPrice');
const ProductInventory = require('../models/ProductInventory');

class ProductController {
    static async getProducts(req, res) {
        const { officeId } = req.body; // Получаем officeId из тела запроса

        if (!officeId) {
            return res.status(400).json({ message: 'Необходимо указать officeId в теле запроса.' });
        }

        try {
            // Получаем товары, относящиеся к определенному офису
            const products = await Product.findAll({
                include: [{
                    model: ProductInventory,
                    where: { office_id: officeId } // Фильтруем по officeId
                }],
            });

            res.status(200).json(products);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при получении списка товаров.' });
        }
    }
    
    static async getProductById(req, res) {
        const { productId } = req.params;
        const { officeId } = req.body; // Получаем officeId из тела запроса

        if (!officeId) {
            return res.status(400).json({ message: 'Необходимо указать officeId в теле запроса.' });
        }

        try {
            const product = await Product.findByPk(productId, {
                include: [{
                    model: ProductInventory,
                    where: { office_id: officeId } // Фильтруем по officeId
                }],
            });

            if (!product) {
                return res.status(404).json({ message: 'Товар не найден.' });
            }

            res.status(200).json(product);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при получении товара.' });
        }
    }

    static async createProduct(req, res) {
        const { name, description, price, officeId, article } = req.body; // Получаем officeId из тела запроса

        if (!officeId) {
            return res.status(400).json({ message: 'Необходимо указать officeId в теле запроса.' });
        }

        try {
            const product = await Product.create({
                name,
                description,
                article,
            });

            // Создаем запись в ProductInventory
            await ProductInventory.create({
                product_id: product.product_id,
                office_id: officeId,
                quantity: 0, // Начальное количество
            });

             // Создаем запись в ProductPrice
             await ProductPrice.create({
                product_id: product.product_id,
                price,
                price_type_id: 1,
                data_s: new Date(),
                data_e: null,
            });

            res.status(201).json(product);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при создании товара.' });
        }
    }

    static async updateProduct(req, res) {
        const { productId } = req.params;
        const { name, description, price, officeId } = req.body; // Получаем officeId из тела запроса

        if (!officeId) {
            return res.status(400).json({ message: 'Необходимо указать officeId в теле запроса.' });
        }

        try {
            const product = await Product.findByPk(productId);

            if (!product) {
                return res.status(404).json({ message: 'Товар не найден.' });
            }

            product.name = name;
            product.description = description;
            await product.save();

            const productPrice = await ProductPrice.findOne({
                where: {
                    product_id: productId,
                },
            });

            if (!productPrice) {
                 return res.status(404).json({ message: 'Информация о цене товара не найдена.' });
            }
            productPrice.price = price;
            await productPrice.save();

            res.status(200).json(product);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при обновлении товара.' });
        }
    }

    static async deleteProduct(req, res) {
        const { productId } = req.params;
        const { officeId } = req.body; // Получаем officeId из тела запроса

        if (!officeId) {
            return res.status(400).json({ message: 'Необходимо указать officeId в теле запроса.' });
        }

        try {
            const product = await Product.findByPk(productId);

            if (!product) {
                return res.status(404).json({ message: 'Товар не найден.' });
            }

            // Определяем, является ли officeId массивом
            const officeIds = Array.isArray(officeId) ? officeId : [officeId];

            // Удаляем записи из ProductInventory для всех указанных officeId
            await ProductInventory.destroy({
                where: {
                    product_id: productId,
                    office_id: {
                        [Sequelize.Op.in]: officeIds // Используем Sequelize.Op.in для массива officeId
                    }
                }
            });

            // Удаляем записи из ProductPrice
            await ProductPrice.destroy({
                where: {
                    product_id: productId,
                }
            });

            //  Только после этого удаляем сам товар
            await product.destroy();
            res.status(200).json({ message: 'Товар удален.' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при удалении товара.' });
        }
    }
}


module.exports = ProductController;