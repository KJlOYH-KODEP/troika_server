const { ProductInventory, Product, ProductDates } = require('../models');
const { Op } = require('sequelize');

const { getPaginationParams } = require('../utils/pagination');

class ProductInventoryController {
    static async getProductInventories(req, res) {
    const {
        officeId,
        productId,
        quantityFloor,
        quantityCeiling,
        quantityOrderedFloor,
        quantityOrderedCeiling,
        categoryId,
        searchQuery,
        sortBy,
        sortOrder,
        unlimited
    } = req.query;

    try {
        // Базовые условия WHERE
        const where = {
            ...(officeId && { office_id: officeId }),
            ...(productId && { product_id: productId }),
            ...((quantityFloor || quantityCeiling) && {
                quantity: {
                    ...(quantityFloor && { [Op.gte]: parseFloat(quantityFloor) }),
                    ...(quantityCeiling && { [Op.lte]: parseFloat(quantityCeiling) })
                }
            }),
            ...((quantityOrderedFloor || quantityOrderedCeiling) && {
                ordered_quantity: {
                    ...(quantityOrderedFloor && { [Op.gte]: parseInt(quantityOrderedFloor) }),
                    ...(quantityOrderedCeiling && { [Op.lte]: parseInt(quantityOrderedCeiling) })
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
                default:
                    order.push([sortBy, sortOrder.toUpperCase()]);
            }
        }

        let inventories;
        if (unlimited === 'true') {
            inventories = await ProductInventory.findAll({
                where,
                include,
                order
            });
        } else {
            const { limit, offset } = getPaginationParams(req);
            const result = await ProductInventory.findAndCountAll({
                where,
                include,
                limit,
                offset,
                order,
                distinct: true
            });

            return res.status(200).json({
                inventories: result.rows,
                total: result.count,
                offset,
                limit
            });
        }

        res.status(200).json({
            total: inventories.length,
            inventories
        });
    } catch (error) {
        console.error("Ошибка при получении списка инвентаря:", error);
        res.status(500).json({
            message: 'Ошибка сервера при получении списка инвентаря.',
            error: error.message
        });
    }
}

    static async getProductInventoryById(req, res) {
        const { inventoryId } = req.params;
        try {
            const inventory = await ProductInventory.findByPk(inventoryId, {
                include: [
                    {
                        model: Product,
                        as: 'product',
                        attributes: ['article', 'name']
                    },
                    {
                        model: ProductDates,
                        as: 'product_dates',
                        attributes: ['data_s', 'data_e']
                    }
                ]
            });
            if (!inventory) {
                return res.status(404).json({ message: 'Инвентарь не найден.' });
            }
            res.status(200).json(inventory);
        } catch (error) {
            console.error("Ошибка при получении инвентаря по ID:", error);
            res.status(500).json({ message: 'Ошибка сервера при получении инвентаря.', error: error.message });
        }
    }

    static async createProductInventory(req, res) {
        const { product_id, office_id, quantity, data_s, data_e } = req.body;
        try {
            const [productDates] = await ProductDates.findOrCreate({
                where: { data_s, data_e }
            });

            const inventory = await ProductInventory.create({
                product_id,
                office_id,
                quantity,
                product_dates_id: productDates.product_dates_id
            });
            res.status(201).json(inventory);
        } catch (error) {
            console.error("Ошибка при создании инвентаря:", error);
            res.status(500).json({ message: 'Ошибка сервера при создании инвентаря.', error: error.message });
        }
    }

    static async updateProductInventory(req, res) {
        const { inventoryId } = req.params;
        const { quantity, data_s, data_e } = req.body;
        try {
            const inventory = await ProductInventory.findByPk(inventoryId);
            if (!inventory) return res.status(404).json({ message: 'Инвентарь не найден.' });

            const [productDates] = await ProductDates.findOrCreate({
                where: { data_s, data_e }
            });

            inventory.quantity = quantity;
            inventory.product_dates_id = productDates.product_dates_id;
            await inventory.save();
            res.status(200).json({ message: 'Инвентарь обновлен.', inventory });
        } catch (error) {
            console.error("Ошибка при обновлении инвентаря:", error);
            res.status(500).json({ message: 'Ошибка сервера при обновлении инвентаря.', error: error.message });
        }
    }
    static async deleteProductInventory(req, res) {
        const { inventoryId } = req.params;
        try {
            const inventory = await ProductInventory.findByPk(inventoryId);
            if (!inventory) return res.status(404).json({ message: 'Запись не найдена.' });
            await inventory.destroy();
            res.status(200).json({ message: 'Запись со склада удалена.' });
        } catch (error) {
            console.error("Ошибка при удалении цены:", error);
            res.status(500).json({ message: 'Ошибка сервера при удалении записи.', error: error.message });
        }
    }
}

module.exports = ProductInventoryController;