const { ProductPrice, Product, PriceType, ProductDates } = require('../models');
const { Op } = require('sequelize');

const { getPaginationParams } = require('../utils/pagination');

class ProductPriceController {
    static async getProductPrices(req, res) {
    const { 
        priceTypeId, 
        productId,
        priceFloor,
        priceCeiling,
        categoryId, // Добавляем параметр категории
        searchQuery,
        sortBy, 
        sortOrder, 
        unlimited 
    } = req.query;

    try {
        // Базовые условия WHERE
        const where = {
            ...(priceTypeId && { price_type_id: priceTypeId }),
            ...(productId && { product_id: productId }),
            ...((priceFloor || priceCeiling) && {
                price: {
                    ...(priceFloor && { [Op.gte]: parseFloat(priceFloor) }),
                    ...(priceCeiling && { [Op.lte]: parseFloat(priceCeiling) })
                }
            })
        };

        // Включение связанных моделей
        const include = [
            {
                model: Product,
                as: 'product',
                attributes: ['article', 'name', 'category_id'],
                ...(categoryId && { where: { category_id: categoryId } }), // Фильтр по категории
                ...(searchQuery && {
                    where: {
                        [Op.and]: [
                            ...(categoryId ? [{ category_id: categoryId }] : []), // Учитываем категорию, если есть
                            {
                                [Op.or]: [
                                    { article: { [Op.iLike]: `%${searchQuery}%` } },
                                    { name: { [Op.iLike]: `%${searchQuery}%` } }
                                ]
                            }
                        ]
                    }
                })
            },
            {
                model: PriceType,
                as: 'price_type',
                attributes: ['name']
            },
            {
                model: ProductDates,
                as: 'product_dates',
                attributes: ['data_s', 'data_e']
            }
        ];

        // Настройка сортировки
        const order = [];
        if (sortBy && sortOrder) {
            switch (sortBy) {
                case 'article':
                    order.push([{ model: Product, as: 'product' }, 'article', sortOrder.toUpperCase()]);
                    break;
                case 'name':
                    order.push([{ model: Product, as: 'product' }, 'name', sortOrder.toUpperCase()]);
                    break;
                case 'category':
                    order.push([{ model: Product, as: 'product' }, 'category_id', sortOrder.toUpperCase()]);
                    break;
                case 'data_s':
                    order.push([{ model: ProductDates, as: 'product_dates' }, 'data_s', sortOrder.toUpperCase()]);
                    break;
                case 'data_e':
                    order.push([{ model: ProductDates, as: 'product_dates' }, 'data_e', sortOrder.toUpperCase()]);
                    break;
                case 'price_type':
                    order.push([{ model: PriceType, as: 'price_type' }, 'name', sortOrder.toUpperCase()]);
                    break;
                default:
                    order.push([sortBy, sortOrder.toUpperCase()]);
            }
        }

        let prices;
        if (unlimited === 'true') {
            prices = await ProductPrice.findAll({
                where,
                include,
                order
            });
        } else {
            const { limit, offset } = getPaginationParams(req);
            const result = await ProductPrice.findAndCountAll({
                where,
                include,
                limit,
                offset,
                order,
                distinct: true
            });
            
            return res.status(200).json({
                prices: result.rows,
                total: result.count,
                offset,
                limit
            });
        }

        res.status(200).json({
            total: prices.length,
            prices
        });
    } catch (error) {
        console.error("Ошибка при получении списка цен:", error);
        res.status(500).json({ 
            message: 'Ошибка сервера при получении списка цен.', 
            error: error.message 
        });
    }
}

    static async getProductPriceById(req, res) {
        const { productPriceId } = req.params;
        try {
            const price = await ProductPrice.findByPk(productPriceId, {
                include: [
                    {
                        model: Product,
                        as: 'product',
                        attributes: ['article', 'name']
                    },
                    {
                        model: PriceType,
                        as: 'price_type',
                        attributes: ['name']
                    },
                    {
                        model: ProductDates,
                        as: 'product_dates',
                        attributes: ['data_s', 'data_e']
                    }
                ]
            });
            if (!price) return res.status(404).json({ message: 'Цена не найдена.' });
            res.status(200).json(price);
        } catch (error) {
            console.error("Ошибка при получении цены по ID:", error);
            res.status(500).json({ message: 'Ошибка сервера при получении цены.', error: error.message });
        }
    }

    static async createProductPrice(req, res) {
        const { product_id, price, price_type_id, data_s, data_e } = req.body;
        try {
            const [productDates] = await ProductDates.findOrCreate({
                where: { data_s, data_e }
            });

            const productPrice = await ProductPrice.create({
                product_id,
                price,
                price_type_id,
                product_dates_id: productDates.product_dates_id
            });
            res.status(201).json(productPrice);
        } catch (error) {
            console.error("Ошибка при создании цены:", error);
            res.status(500).json({ message: 'Ошибка сервера при создании цены.', error: error.message });
        }
    }

    static async updateProductPrice(req, res) {
        const { productPriceId } = req.params;
        const { price, price_type_id, data_s, data_e } = req.body;
        try {
            const productPrice = await ProductPrice.findByPk(productPriceId);
            if (!productPrice) return res.status(404).json({ message: 'Цена не найдена.' });

            const [productDates] = await ProductDates.findOrCreate({
                where: { data_s, data_e }
            });

            if (price) productPrice.price = price;
            if (price_type_id) productPrice.price_type_id = price_type_id;
            productPrice.product_dates_id = productDates.product_dates_id;
            await productPrice.save();
            res.status(200).json({ message: 'Цена обновлена.', productPrice });
        } catch (error) {
            console.error("Ошибка при обновлении цены:", error);
            res.status(500).json({ message: 'Ошибка сервера при обновлении цены.', error: error.message });
        }
    }

    static async deleteProductPrice(req, res) {
        const { productPriceId } = req.params;
        try {
            const productPrice = await ProductPrice.findByPk(productPriceId);
            if (!productPrice) return res.status(404).json({ message: 'Цена не найдена.' });
            await productPrice.destroy();
            res.status(200).json({ message: 'Цена удалена.' });
        } catch (error) {
            console.error("Ошибка при удалении цены:", error);
            res.status(500).json({ message: 'Ошибка сервера при удалении цены.', error: error.message });
        }
    }
}

module.exports = ProductPriceController;