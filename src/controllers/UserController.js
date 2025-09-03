// src/controllers/UserController.js
const { Client } = require('../models');
const { Op } = require('sequelize');

const { getPaginationParams } = require('../utils/pagination');

class UserController {

    static async getUser(req, res) {
        const { userId } = req.params;
        if (!req.user.role && !req.user.userId === userId ) {
            return res.status(404).json({ message: 'Нет прав доступа.' });
        }

        try {
            const user = await Client.findByPk(userId, {
                attributes: ['client_id', 'email', 'first_name', 'last_name', 'phone_number']
            });

            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден.' });
            }

            res.status(200).json(user);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при получении информации о пользователе.' });
        }
    }

    // Get list of users with pagination
     static async getUsers(req, res) {
        const { limit, offset } = getPaginationParams(req);
        const { searchQuery, sortBy, sortOrder } = req.query;
        let whereClause = {};

        if (searchQuery) {
            whereClause = {
                [Op.or]: [
                    { first_name: { [Op.iLike]: `%${searchQuery}%` } },
                    { last_name: { [Op.iLike]: `%${searchQuery}%` } },
                    { email: { [Op.iLike]: `%${searchQuery}%` } },
                    { phone_number: { [Op.iLike]: `%${searchQuery}%` } }
                ]
            };
        }

        const orderClause = [];
        if (sortBy && sortOrder) {
            orderClause.push([sortBy, sortOrder.toUpperCase()]);
        }

        try {
            const users = await Client.findAll({
                attributes: ['client_id', 'email', 'first_name', 'last_name', 'phone_number', 'registration_date'],
                where: whereClause,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: orderClause.length > 0 ? orderClause : undefined
            });

            res.status(200).json({
                total: await Client.count({ where: whereClause }), // Общее количество пользователей для пагинации
                users
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при получении списка пользователей.' });
        }
    }
    static async updateCredentials(req, res) {
        const { email, password, phone_number } = req.body;
        const userId = req.user.userId; // Assuming you have user info in req.user

        if (!email && !password && !phone_number) {
            return res.status(400).json({ message: 'Необходимо указать хотя бы одно поле для изменения.' });
        }

        try {
            const user = await Client.findByPk(userId);
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден.' });
            }

            if (email) {
                user.email = email;
            }
            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                user.password = hashedPassword;
            }
            if (phone_number) {
                user.phone_number = phone_number;
            }

            await user.save();

            res.status(200).json({ message: 'Учетные данные успешно обновлены.' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при обновлении учетных данных.' });
        }
    }
}

module.exports = UserController;