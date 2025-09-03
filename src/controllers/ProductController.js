// src/controllers/ProductController.js
const Product = require('../models/Product');
const ProductPrice = require('../models/ProductPrice');
const ProductInventory = require('../models/ProductInventory');
const PriceType = require('../models/PriceType');
const Category = require('../models/Category')
const { db } = require('../config/database');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

const { getPaginationParams } = require('../utils/pagination');

class ProductController {
    static async getProductsCount(req, res) {
        try {
            const count = await Product.count();
            res.status(200).json({ count });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при получении количества товаров' });
        }
    }

    static async getProducts(req, res) {
        const {
            // Параметры поиска
            searchQuery,
            // Фильтры
            officeId,
            categoryId,
            priceFloor,
            priceCeiling,
            quantityFloor,
            quantityCeiling,
            priceTypeId,
            // Сортировка
            sortBy,
            sortOrder,
            // Пагинация
            unlimited
        } = req.query;
    
        try {
            // Получаем все дочерние категории, если указана categoryId
            let categoryIds = [];
            if (categoryId) {
                const categories = await Category.findAll({
                    where: {
                        [Op.or]: [
                            { category_id: categoryId }, // Сама категория
                            { parent_category_id: categoryId }, // Прямые потомки
                            // Для глубоких вложений можно использовать рекурсивный запрос
                        ]
                    }
                });
                categoryIds = categories.map(c => c.category_id);
            }

            // Формируем условия запроса
            const where = {};
            if (categoryIds.length > 0) {
                where.category_id = { [Op.in]: categoryIds };
            } else if (categoryId) {
                where.category_id = categoryId;
            }

            // 3. Остальная логика (офисы, цены и т.д.)
            const include = [];
            if (officeId) {
                include.push({
                    model: ProductInventory,
                    as: 'inventory',
                    where: { office_id: officeId },
                    required: true
                });
            }
    
            // Поиск по тексту
            if (searchQuery) {
                where[Op.or] = [
                    { name: { [Op.iLike]: `%${searchQuery}%` } },
                    { article: { [Op.iLike]: `%${searchQuery}%` } },
                    { description: { [Op.iLike]: `%${searchQuery}%` } }
                ];
            }

    
            // Данные по складу
            if (officeId) {
                const inventoryWhere = { office_id: officeId };
    
                // Фильтр по количеству
                if (quantityFloor) inventoryWhere.quantity = { [Op.gte]: parseInt(quantityFloor) };
                if (quantityCeiling) {
                    inventoryWhere.quantity = inventoryWhere.quantity || {};
                    inventoryWhere.quantity[Op.lte] = parseInt(quantityCeiling);
                }
    
                include.push({
                    model: ProductInventory,
                    as: 'inventory',
                    where: inventoryWhere,
                    required: true
                });
            }
    
            // Данные по ценам
            if (priceTypeId || priceFloor || priceCeiling) {
                const priceWhere = {};
                
                // Фильтр по типу цены
                if (priceTypeId) {
                    priceWhere.price_type_id = priceTypeId;
                }
                
                // Фильтр по диапазону цен
                if (priceFloor) priceWhere.price = { [Op.gte]: parseFloat(priceFloor) };
                if (priceCeiling) {
                    priceWhere.price = priceWhere.price || {};
                    priceWhere.price[Op.lte] = parseFloat(priceCeiling);
                }
    
                include.push({
                    model: ProductPrice,
                    as: 'prices',
                    where: priceWhere,
                    required: !!priceTypeId // Обязательно только если явно запрошен тип цены
                });
            }
    
            // Сортировка
            const order = [];
            if (sortBy && sortOrder) {
                order.push([sortBy, sortOrder.toUpperCase()]);
            }
    
            // Запрос к БД
            if (unlimited === 'true') {
                const products = await Product.findAndCountAll({
                    where,
                    include,
                    distinct: true,
                    order
                });
                res.json({
                    total: products.count,
                    products: products.rows
                });
            } else {
                const { limit, offset } = getPaginationParams(req);
                const products = await Product.findAndCountAll({
                    where,
                    include,
                    distinct: true,
                    limit,
                    offset,
                    order
                });
                res.json({
                    total: products.count,
                    limit,
                    offset,
                    products: products.rows
                });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при получении товаров' });
        }
    }

    static async getProductsForClient(req, res) {
        const {
            officeId,
            searchQuery,
            categoryId,
            priceFloor,
            priceCeiling,
            sortBy,
            sortOrder
        } = req.query;
        
        if (!officeId) {
            return res.status(400).json({ message: 'Не указан склад' });
        }

        try {
            // 1. Проверяем тип цены
            const priceType = await PriceType.findAll({
                where: {
                    name: { [Op.iLike]: 'розничн%' }
                },
                attributes: ['price_type_id']
            });

            // 2. Формируем условия запроса
            const where = {};
            const include = [
                {
                    model: ProductInventory,
                    as: 'inventory',
                    where: { 
                        office_id: officeId,
                        quantity: { [Op.gt]: 0 }
                    },
                    required: true
                },
                {
                    model: ProductPrice,
                    as: 'prices',
                    where: { 
                        price_type_id: priceType[0].price_type_id,
                        ...(priceFloor && { price: { [Op.gte]: parseFloat(priceFloor) } }),
                        ...(priceCeiling && { price: { [Op.lte]: parseFloat(priceCeiling) } })
                    },
                    required: true,
                },
                {
                    model: Category,
                    as: 'category',
                    attributes: ['name'],
                    required: false
                }
            ];

            if (searchQuery) {
                where[Op.or] = [
                    { name: { [Op.iLike]: `%${searchQuery}%` } },
                    { article: { [Op.iLike]: `%${searchQuery}%` } }
                ];
            }

            if (categoryId) {
                where.category_id = categoryId;
            }

            // 3. Выполняем запрос
            const { limit, offset } = getPaginationParams(req);
            const products = await Product.findAndCountAll({
                where,
                include,
                distinct: true,
                limit,
                offset,
                order: sortBy && sortOrder ? [[sortBy, sortOrder.toUpperCase()]] : []
            });

            // 4. Формируем ответ с изображениями
            const productsWithImages = await Promise.all(products.rows.map(async p => {
                let imageUrl = null;

                // Проверяем изображение товара по артикулу
                const jpgPath = path.join(__dirname, `../../public/images/articles/${p.article}.jpg`);
                const pngPath = path.join(__dirname, `../../public/images/articles/${p.article}.png`);

                if (fs.existsSync(jpgPath)) {
                    imageUrl = `/images/articles/${p.article}.jpg`;
                } else if (fs.existsSync(pngPath)) {
                    imageUrl = `/images/articles/${p.article}.png`;
                }

                // Если нет изображения товара, проверяем изображение категории
                if (!imageUrl && p.category) {
                    const jpgCategoryPath = path.join(__dirname, `../../public/images/categories/${p.category.name}.jpg`);
                    const pngCategoryPath = path.join(__dirname, `../../public/images/categories/${p.category.name}.png`);

                    if (fs.existsSync(jpgCategoryPath)) {
                        imageUrl = `/images/categories/${p.category.name}.jpg`;
                    } else if (fs.existsSync(pngCategoryPath)) {
                        imageUrl = `/images/categories/${p.category.name}.png`;
                    }
                }

                // Если нет ни товара, ни категории, используем плейсхолдер
                if (!imageUrl) {
                    imageUrl = '/images/placeholder.png';
                }

                return {
                    id: p.product_id,
                    name: p.name,
                    article: p.article,
                    price: p.prices[0]?.price,
                    quantity: p.inventory[0]?.quantity,
                    categoryId: p.category_id,
                    imageUrl
                };
            }));

            res.json({
                total: products.count,
                limit,
                offset,
                products: productsWithImages
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при получении товаров' });
        }
    }
    
    static async getProductById(req, res) {
        const { productId } = req.params;
        let office_id;
        
        if (req.user.role.admin == false && req.user.role.moderator == false) {
            office_id = req.user.office_id;
        } else {
            office_id = req.query.officeId;
            if (!office_id) {
                return res.status(400).json({
                    message: 'Для вашей роли необходимо указать office_id в параметрах запроса или теле запроса.'
                });
            }
        }

        const client = req.client;

        try {
            const product = await Product.findByPk(productId, {
                include: [
                    {
                        model: ProductInventory,
                        as: 'inventory',
                        where: { office_id: office_id },
                        required: false
                    },
                    {
                        model: ProductPrice,
                        as: 'prices',
                        include: [{
                            model: PriceType,
                            as: 'price_type'
                        }],
                        required: false
                    }
                ]
            });
            if (!product) {
                return res.status(404).json({ message: 'Товар не найден.' });
            }
            // Фильтруем цены для клиентов
            if (client && product.ProductPrices) {
                product.ProductPrices = product.ProductPrices.filter(price => {
                    return price.PriceType && (
                        price.PriceType.name.startsWith('Розничн')
                    );
                });
            }
            res.status(200).json(product);

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при получении информации о товаре.' });
        }
    }

    static async getProductsImages(req, res) {
        const { productIds } = req.query;

        let product_ids;

        if (Array.isArray(productIds)) {
            product_ids = productIds;
        } else if (typeof productIds === 'string') {
            product_ids = productIds.split(',').map(Number);
        } else {
            return res.status(400).json({ message: 'Неверный формат параметра productIds. Ожидается строка или массив.' });
        }

        try {
            const products = await Product.findAll({
                where: {
                    product_id: {
                        [Op.in]: product_ids
                    }
                },
                attributes: ['product_id', 'article', 'category_id']
            });

            const imagePaths = {};

            for (const product of products) {
                let imagePath = null;

                // 1. Проверяем наличие изображения товара по артикулу
                const jpgPath = path.join(__dirname, `../../public/images/articles/${product.article}.jpg`);
                const pngPath = path.join(__dirname, `../../public/images/articles/${product.article}.png`);

                if (fs.existsSync(jpgPath)) {
                    imagePath = `/images/articles/${product.article}.jpg`;
                } else if (fs.existsSync(pngPath)) {
                    imagePath = `/images/articles/${product.article}.png`;
                }

                // 2. Если нет изображения товара, проверяем наличие изображения категории
                if (!imagePath) {
                    const category = await Category.findByPk(product.category_id, { attributes: ['name'] });
                    if (category) {
                        const jpgCategoryPath = path.join(__dirname, `../../public/images/categories/${category.name}.jpg`);
                        const pngCategoryPath = path.join(__dirname, `../../public/images/categories/${category.name}.png`);

                        if (fs.existsSync(jpgCategoryPath)) {
                            imagePath = `/images/categories/${category.name}.jpg`;
                        } else if (fs.existsSync(pngCategoryPath)) {
                            imagePath = `/images/categories/${category.name}.png`;
                        }
                    }
                }

                // 3. Если нет ни товара, ни категории, используем плейсхолдер
                if (!imagePath) {
                    imagePath = '/images/placeholder.png';
                }

                // Добавляем product_id в массив к данному пути
                if (imagePaths[imagePath]) {
                    imagePaths[imagePath].push(product.product_id);
                } else {
                    imagePaths[imagePath] = [product.product_id];
                }
            }

            res.status(200).json(imagePaths);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при получении изображений товаров.' });
        }
    }

    static async updateProduct(req, res) {
        const { productId } = req.params;
        const { name, description, article } = req.body; // Only allow name, description, and article

        try {
            const product = await Product.findByPk(productId);

            if (!product) {
                return res.status(404).json({ message: 'Товар не найден.' });
            }

            // Update fields if provided
            if (name !== undefined) product.name = name;
            if (description !== undefined) product.description = description;
            if (article !== undefined) product.article = article;

            await product.save();

            res.status(200).json({ message: 'Информация о товаре успешно обновлена.', product });
        } catch (error) {
            console.error('Ошибка при обновлении товара:', error);
            res.status(500).json({ message: 'Ошибка при обновлении товара.' });
        }
    }

    static async deleteProduct(req, res) {
    const { productId } = req.params;

    if (!req.user.role.admin == true ) {
        return res.status(403).json({ message: 'У вас нет прав на удаление товара.' });
    }

    const transaction = await db.transaction();

    try {
        const product = await Product.findByPk(productId, { transaction });

        if (!product) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Товар не найден.' });
        }
        // 1. Сначала закрываем все активные цены
        await ProductPrice.destroy({
            where: {
                product_id: productId,
            },
            transaction: transaction // Ensure transaction is passed correctly
        });
        // 2. Удаляем инвентарь во всех офисах
        await ProductInventory.destroy({
            where: { product_id: productId },
            transaction
        });
        // 3. Удаляем все исторические цены
        await ProductPrice.destroy({
            where: { product_id: productId },
            transaction
        });

        // 4. Удаляем сам продукт
        await product.destroy({ transaction });

        await transaction.commit();

        res.status(200).json({ message: 'Товар успешно удален из системы.' });

    } catch (error) {
        await transaction.rollback();
        console.error("Ошибка при удалении товара:", error);
        return res.status(500).json({ message: 'Ошибка сервера при удалении товара.', error: error.message });
    }

    }

    static async deleteProductFromOffice(req, res) {
        const { productId, officeId } = req.params;

        if (!req.user.role.admin == true && !req.user.role.moderator == true) {
            return res.status(403).json({ message: 'У вас нет прав на удаление товара из офиса.' });
        }

        const transaction = await db.transaction();

        try {
            const product = await Product.findByPk(productId, { transaction });

            if (!product) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Товар не найден.' });
            }

            // Удаляем инвентарь для указанного офиса
            const result = await ProductInventory.destroy({
                where: {
                    product_id: productId,
                    office_id: officeId
                },
                transaction
            });

            if (result === 0) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Товар не найден в указанном офисе.' });
            }

            await transaction.commit();

            res.status(200).json({ message: 'Товар успешно удален из указанного офиса.' });

        } catch (error) {
            await transaction.rollback();
            console.error('Ошибка удаления товара из офиса:', error);
            res.status(500).json({ message: 'Ошибка при удалении товара из офиса.' });
        }
    }

    static async getLowStockProducts(req, res) {
        const { officeId } = req.query;
        const LIMIT = 10;
        try {
            const lowStockProducts = await Product.findAll({
                limit: LIMIT,
                include: [{
                    model: ProductInventory,
                    as: 'inventory',
                    where: {
                        office_id: officeId,
                        quantity: { [Op.lte]: 10 } // Adjust this threshold as needed
                    },
                    required: true
                }],
                order: [[{ model: ProductInventory, as: 'inventory' }, 'quantity', 'ASC']]
            });

            res.status(200).json(lowStockProducts);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при получении списка товаров с низким остатком.' });
        }
    }
}

module.exports = ProductController;