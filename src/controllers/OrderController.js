// src/controllers/OrderController.js
const { Order, OrderItem, Product, Address, OrderAddress, ProductPrice, ProductInventory, Client } = require('../models');
const { db } = require('../config/database');
const { Op } = require('sequelize');

const { getPaginationParams } = require('../utils/pagination');

class OrderController {
    static async createOrder(req, res) {
        const requiredFields = ['items', 'address', 'delivery_method', 'payment_method', 'office_id'];
        const clientId = req.user.user_id;

        for (const field of requiredFields) {
            if (req.body[field] === undefined) {
                return res.status(400).json({
                    message: `Поле ${field} обязательно для заполнения`,
                    error: 'MISSING_REQUIRED_FIELD'
                });
            }
        }

        const addressFields = ['address_line1', 'settlement', 'postal_code', 'country'];
        for (const field of addressFields) {
            if (!req.body.address[field]) {
                return res.status(400).json({
                    message: `Поле address.${field} обязательно`,
                    error: 'INVALID_ADDRESS'
                });
            }
        }

        const { items, address, delivery_method, payment_method, comment, office_id } = req.body;

        const transaction = await db.transaction();
        try {
            if (!items || !Array.isArray(items) || items.some(item => !item.product_price_id)) {
                throw new Error('Некорректные данные товаров: отсутствует product_price_id');
            }
            const order = await Order.create({
                client_id: clientId,
                total_amount: 0,
                order_date: new Date(),
                status: 'Новый',
                delivery_method,
                payment_method,
                comment,
                office_id,
                last_change: new Date(),
            }, {transaction});
            if (delivery_method === 'Доставка') {
               const [addressData] = await Address.findOrCreate({
                    where: {
                        address_line1: address.address_line1, 
                        address_line2: address.address_line2, 
                        settlement: address.settlement, 
                        region: address.region, 
                        postal_code: address.postal_code, 
                        country: address.country
                    },
                    
                    transaction: transaction // Keep this if you're using a transaction
                });
                console.log('here ->', addressData)
                await OrderAddress.create({
                    order_id: order.order_id,
                    address_id: addressData.address_id
                }, { transaction });
                console.log('here1')
            }

            let totalAmount = 0;
            for (const item of items) {
                const productPrice = await ProductPrice.findByPk(item.product_price_id, {
                    include: {
                        model: Product,
                        as: 'product'
                    }
                }, {transaction});

                if (!productPrice) {
                    throw new Error(`Цена товара с ID ${item.product_price_id} не найдена.`);
                }
                const productInventory = await ProductInventory.findOne({
                    where: {
                        product_id: productPrice.product_id,
                        office_id: office_id
                    }
                }, {transaction});
                if (!productInventory) {
                    throw new Error(`Товар "${productPrice.product.name}" отсутствует на складе.`);
                }

                const availableQuantity = productInventory.quantity - productInventory.ordered_quantity;

                if (availableQuantity < item.quantity) {
                    throw new Error(`Недостаточно товара "${productPrice.product.name}" на складе. Доступно: ${availableQuantity}, запрошено: ${item.quantity}`);
                }
                totalAmount += productPrice.price * item.quantity;

                await OrderItem.create({
                    order_id: order.order_id,
                    product_price_id: item.product_price_id,
                    quantity: item.quantity
                }, { transaction });
                productInventory.ordered_quantity += item.quantity;
                await productInventory.save({ transaction });
            }
            await order.update({ total_amount: totalAmount }, { transaction });

            await transaction.commit();
            res.status(201).json({
                message: 'Заказ успешно создан и ожидает оплаты.',
                order
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Ошибка создания заказа:', error);

            if (error.name === 'SequelizeValidationError') {
                const errors = error.errors.map(err => err.message);
                return res.status(400).json({ message: 'Ошибка валидации', errors });
            }

            res.status(500).json({
                message: 'Ошибка при создании заказа',
                error: error.message
            });
        }
    }

    static async updateOrderItems(req, res) {
        const { orderId } = req.params;
        const { items } = req.body;
        const userId = req.user.userId;

        try {
            const order = await Order.findByPk(orderId);

            if (!order) {
                return res.status(404).json({ message: 'Заказ не найден.' });
            }

            if (order.client_id !== userId) {
                return res.status(403).json({ message: 'У вас нет прав для редактирования этого заказа.' });
            }
            //order.last_change = new Date(); 
            return res.status(400).json({ message: 'Редактирование позиций заказа запрещено.' });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при обновлении позиций заказа.' });
        }
    }

    static async getOrder(req, res) {
        const { orderId } = req.params;
        const userId = req.user.userId;

        try {
            const order = await Order.findOne({
                where: {
                    [Op.or]: [
                        { order_id: orderId },
                        { public_order_id: orderId }
                    ]
                },
                include: [
                    {
                        model: OrderItem,
                        as: 'order_items',
                        include: [{ // Добавляем включение ProductPrice
                            model: ProductPrice,
                            as: 'product_price',
                            include: [{ // Добавляем включение Product
                                model: Product,
                                as: 'product',
                                attributes: ['article'] // Указываем, какие атрибуты нужны из Product
                            }]
                        }]
                    },
                    { model: OrderAddress, as: 'shipping_address' }
                ]
            });

            if (!order) {
                return res.status(404).json({ message: 'Заказ не найден.' });
            }

            if (order.client_id !== userId && !req.user.role.admin == true && !req.user.role.moderator == true && !req.user.role.staff == true) {
                return res.status(403).json({ message: 'У вас нет прав для просмотра этого заказа.' });
            }

            res.status(200).json(order);

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при получении информации о заказе.' });
        }
    }

    static async getUserOrders(req, res) {
        const userId = req.user.userId;
        
        // Параметры сортировки
        const sortBy = req.query.sortBy || 'order_date';
        const sortOrder = req.query.sortOrder || 'DESC';
    
        try {
            const orders = await Order.findAll({
                where: { client_id: userId },
                order: [[sortBy, sortOrder]], // Добавлена сортировка
                include: [
                    { model: OrderItem, as: 'order_items' },
                    { model: OrderAddress, as: 'shipping_address' }
                ]
            });
    
            res.status(200).json({
                sortBy,
                sortOrder,
                orders
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при получении списка заказов пользователя.' });
        }
    }

    static async getOrders(req, res) {
        const { limit, offset } = getPaginationParams(req);

        // Параметры сортировки
        const sortBy= req.query.sortBy || 'order_date'; // По умолчанию сортировка по дате заказа
        const sortOrder = req.query.sortOrder || 'DESC'; // По умолчанию новые сначала

        // Разделяем статусы, если они переданы в виде строки с запятыми
        const statuses = req.query.statuses ? req.query.statuses.split(',') : [];
        const orderDate = req.query.order_date;
        const minPrice = req.query.min_price;
        const maxPrice = req.query.max_price;
        const deliveryMethods = req.query.delivery_methods ? req.query.delivery_methods.split(',') : [];
        const paymentMethods = req.query.payment_methods ? req.query.payment_methods.split(',') : [];

        try {
            const where = {};
            if (statuses.length > 0) {
              where.status = { [Op.in]: statuses };
            }
            if (orderDate) {
              try {
                const [startDate, endDate] = JSON.parse(orderDate);
                where.order_date = { [Op.between]: [new Date(startDate), new Date(endDate)] };
              } catch (parseError) {
                console.error('Ошибка парсинга даты:', parseError);
                return res.status(400).json({ message: 'Некорректный формат даты.' });
              }
            }

            if (minPrice) {
              where.total_amount = { ...where.total_amount, [Op.gte]: parseFloat(minPrice) };
            }

            if (maxPrice) {
              where.total_amount = { ...where.total_amount, [Op.lte]: parseFloat(maxPrice) };
            }

            if (deliveryMethods.length > 0) {
                where.delivery_method = { [Op.in]: deliveryMethods };
            }

            if (paymentMethods.length > 0) {
                where.payment_method = { [Op.in]: paymentMethods };
            }

          const orders = await Order.findAndCountAll({
            where,
            limit,
            offset,
            order: [[sortBy, sortOrder]], // Добавлена сортировка
            include: [
              { model: OrderItem, as: 'order_items' },
              { model: OrderAddress, as: 'shipping_address' },
              {
                model: Client,
                as: 'client',
                attributes: ['first_name', 'last_name']
              }
            ],
            distinct: true 
          });

          res.status(200).json({
            total: orders.count,
            limit,
            offset,
            sortBy,
            sortOrder,
            orders: orders.rows
          });
        } catch (error) {
          console.error(error);
          res.status(500).json({ message: 'Ошибка при получении списка всех заказов.' });
        }
    }

    static async getAllUserOrders(req, res) {
        const { userId } = req.params;
        const { limit, offset } = getPaginationParams(req);
    
        // Параметры сортировки
        const sortBy = req.query.sortBy || 'order_date';
        const sortOrder = req.query.sortOrder || 'desc';
    
        try {
            const orders = await Order.findAll({
                where: { client_id: userId },
                limit,
                offset,
                order: [[sortBy, sortOrder]], // Добавлена сортировка
                include: [
                    { model: OrderItem, as: 'order_items' },
                    { model: OrderAddress, as: 'shipping_address' }
                ]
            });
    
            res.status(200).json({
                sortBy,
                sortOrder,
                orders
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при получении списка заказов пользователя.' });
        }
    }

    static async updateOrderStatus(req, res) {
        const { orderId } = req.params;
        const { status } = req.body;

        if (!req.user.role.admin == true && !req.user.role.moderator == true && !req.user.role.staff == true) {
            return res.status(403).json({ message: 'У вас нет прав для изменения статуса заказа.' });
        }

        const transaction = await db.transaction();
        try {
            const order = await Order.findByPk(orderId, {
                include: [
                    {
                        model: OrderItem,
                        as: 'order_items',
                        include: [
                            {
                                model: ProductPrice,
                                as: 'product_price',
                                include: [{model: Product, as: 'product'}]
                            }
                        ]
                    }
                ],
                transaction
            });
            if (!order) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Заказ не найден.' });
            }
            
            if (['Новый', 'В обработке', 'В доставке', 'Выполнен', 'Отменен'].indexOf(status) === -1) {
                await transaction.rollback();
                return res.status(400).json({ message: 'Недопустимый статус заказа.' });
            }
            const prevStatus = order.status;
            order.status = status;
            order.last_change = new Date();
            await order.save({ transaction });

            for (const item of order.order_items) {
                const productId = item.product_price.product_id;
                const quantity = item.quantity;

                const inventory = await ProductInventory.findOne({
                    where: {
                        product_id: productId,
                        office_id: order.office_id
                    },
                    transaction
                });

                if (!inventory) {
                    throw new Error(`Инвентарь для товара с ID ${productId} не найден.`);
                }
                if (status === 'Отменен' && prevStatus !== 'Отменен') {
                    inventory.quantity += parseFloat(quantity);
                    inventory.ordered_quantity -= parseFloat(quantity);
                } else if (status !== 'Отменен' && prevStatus === 'Отменен') {
                    inventory.quantity -= parseFloat(quantity);
                    inventory.ordered_quantity += parseFloat(quantity);
                }
                await inventory.save({ transaction });
            }

            await transaction.commit();
            res.status(200).json({ message: 'Статус заказа успешно обновлен.', order });
        } catch (error) {
            await transaction.rollback();
            console.error(error);
            res.status(500).json({ message: 'Ошибка при обновлении статуса заказа.' });
        }
    }

    static async getProductAvailability(req, res) {
        const { productId, officeId } = req.params;

        try {
            const inventory = await ProductInventory.findOne({
                where: {
                    product_id: productId,
                    office_id: officeId
                }
            });

            if (!inventory) {
                return res.status(404).json({ message: 'Инвентарь для товара не найден.' });
            }

            res.status(200).json({
                totalQuantity: inventory.quantity,
                orderedQuantity: inventory.ordered_quantity,
                availableQuantity: inventory.quantity - inventory.ordered_quantity
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при получении информации о доступности товара.' });
        }
    }

    static async cancelOrder(req, res) {
        const { orderId } = req.params;
        const userId = req.user.userId;

        const transaction = await db.transaction();

        try {
            const order = await Order.findByPk(orderId, {
                include: [
                    {
                        model: OrderItem,
                        as: 'order_items',
                        include: [
                            {
                                model: ProductPrice,
                                as: 'product_price',
                                include: [Product]
                            }
                        ]
                    }
                ],
                transaction
            });

            if (!order) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Заказ не найден.' });
            }

            if (order.client_id !== userId) {
                await transaction.rollback();
                return res.status(403).json({ message: 'У вас нет прав для отмены этого заказа.' });
            }

            if (order.status === 'Выполнен') {
                await transaction.rollback();
                return res.status(400).json({ message: 'Нельзя отменить выполненный заказ.' });
            }

            order.status = 'Отменен';
            order.last_change = new Date(); 
            await order.save({ transaction });

            for (const item of order.order_items) {
                const productId = item.product_price.product_id;
                const quantity = item.quantity;

                const inventory = await ProductInventory.findOne({
                    where: {
                        product_id: productId,
                        office_id: order.office_id
                    },
                    transaction
                });

                if (!inventory) {
                    throw new Error(`Инвентарь для товара с ID ${productId} не найден.`);
                }
                inventory.quantity += parseFloat(quantity);
                inventory.ordered_quantity -= parseFloat(quantity);
                await inventory.save({ transaction });
            }
            await transaction.commit();

            res.status(200).json({ message: 'Заказ успешно отменен.' });

        } catch (error) {
            await transaction.rollback();
            console.error(error);
            res.status(500).json({ message: 'Ошибка при отмене заказа.' });
        }
    }
}

module.exports = OrderController;