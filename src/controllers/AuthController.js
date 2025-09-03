// src/controllers/AuthController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const Staff = require('../models/Staff');
const StaffPermissions = require('../models/StaffPermissions');
require('dotenv').config();
const secretKey = process.env.JWT_SECRET;
const saltRounds = 10;

class AuthController {
    static async registerClient(req, res) {
        try {
            const { email, password, first_name, last_name, phone_number } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: 'Email и пароль обязательны.' });
            }

            const existingClient = await Client.findOne({ where: { email } });
            if (existingClient) {
                return res.status(400).json({ message: 'Пользователь с таким email уже существует.' });
            }

            const hashedPassword = await bcrypt.hash(password, saltRounds); // Ключевое место!  Хэширование!

            const newClient = await Client.create({
                email,
                password: hashedPassword, // Сохраняем ХЭШ!
                first_name,
                last_name,
                phone_number,
            });

            const token = jwt.sign({ userId: newClient.client_id, email: newClient.email }, secretKey, { expiresIn: '2h' });

            res.status(201).json({ message: 'Регистрация успешна', token, isClient: true});
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            res.status(500).json({ message: 'Ошибка сервера при регистрации.' });
        }
    }

    static async loginClient(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: 'Email и пароль обязательны.' });
            }

            // Try to find the user in the Client table
            let user = await Client.findOne({ where: { email } });

            if (!user) {
                // If not found in Client table, try to find in Staff table
                user = await Staff.findOne({
                    where: { email },
                    include: [{ model: StaffPermissions, as: 'role' }], // Include StaffPermissions
                });

                if (!user) {
                    return res.status(401).json({ message: 'Неверный email или пароль.' });
                }

                // Check password for Staff
                const isPasswordValid = await bcrypt.compare(password, user.password);

                if (!isPasswordValid) {
                    return res.status(401).json({ message: 'Неверный email или пароль.' });
                }

                // Generate token for Staff
                const token = jwt.sign(
                    {
                        user_id: user.staff_id,
                        role: {
                            admin: user.role.is_admin,
                            moderator: user.role.is_moderator,
                            staff: user.role.is_staff,
                        },
                        office_id: user.office_id,
                    },
                    secretKey,
                    { expiresIn: '6h' }
                );

                return res.status(200).json({ message: 'Вход выполнен успешно', token });
            }

            // Check password for Client
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Неверный email или пароль.' });
            }

            // Generate token for Client 
            const token = jwt.sign({ user_id: user.client_id, role: 'client' }, secretKey, { expiresIn: '2h' });

            res.status(200).json({ message: 'Вход выполнен успешно', token});
        } catch (error) {
            console.error('Ошибка входа:', error);
            res.status(500).json({ message: 'Ошибка сервера при входе.' });
        }
    }

    static async loginStaff(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: 'Email и пароль обязательны.' });
            }

            // Try to find the user in the Client table
            let user = await Staff.findOne({
                    where: { email },
                    include: [{ model: StaffPermissions, as: 'role' }], // Include StaffPermissions
                });
            if (!user) {
                return res.status(401).json({ message: 'Неверный email или пароль.' });
            }
            // Check password for Staff
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Неверный email или пароль.' });
            }

            // Generate token for Staff
            const token = jwt.sign(
                {
                    user_id: user.staff_id,
                    role: {
                        admin: user.role.is_admin,
                        moderator: user.role.is_moderator,
                        staff: user.role.is_staff,
                       },
                       office_id: user.office_id,
                },
                secretKey,
                { expiresIn: '6h' }
            );
            return res.status(200).json({ message: 'Вход выполнен успешно', token });
        } catch (error) {
            console.error('Ошибка входа:', error);
            res.status(500).json({ message: 'Ошибка сервера при входе.' });
        }
    }
}

module.exports = AuthController;