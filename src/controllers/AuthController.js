// src/controllers/AuthController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const Staff = require('../models/Staff');
const StaffPermissions = require('../models/StaffPermissions');
const StaffApplication = require('../models/StaffApplication');
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

            const token = jwt.sign({ userId: newClient.client_id, role: 'client' }, secretKey, { expiresIn: '1h' });

            res.status(201).json({ message: 'Регистрация успешна', token });
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            res.status(500).json({ message: 'Ошибка сервера при регистрации.' });
        }
    }
    static async registerStaff(req, res) {
        try {
            const { email, password, first_name, last_name, phone_number, role } = req.body; // Добавляем role
            if (!email || !password || !first_name || !last_name || !phone_number) {
                return res.status(400).json({ message: 'Все поля обязательны.' });
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Определяем роли
            const isAdmin = role && role.includes('admin');
            const isModerator = role && role.includes('moderator');
            const isStaff = true; // По умолчанию всегда сотрудник

            // Поиск или создание StaffPermissions
            let permissions = await StaffPermissions.findOne({
                where: {
                    is_admin: isAdmin,
                    is_moderator: isModerator,
                    is_staff: isStaff,
                },
            });

            if (!permissions) {
                permissions = await StaffPermissions.create({
                    is_admin: isAdmin,
                    is_moderator: isModerator,
                    is_staff: isStaff,
                });
            }

            const newStaff = await Staff.create({
                email,
                password: hashedPassword,
                first_name,
                last_name,
                phone_number,
                permission_id: permissions.permission_id, // Используем permission_id
            });
            res.status(201).json({ message: 'Сотрудник успешно зарегистрирован.' });
        } catch (error) {
            console.error('Ошибка регистрации сотрудника:', error);
            res.status(500).json({ message: 'Ошибка сервера при регистрации сотрудника.' });
        }
    }

    static async registerStaffApplication(req, res) {
        try {
            const { email, password, first_name, last_name, phone_number } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: 'Email и пароль обязательны.' });
            }

            const existingApplication = await StaffApplication.findOne({ where: { email } });
            if (existingApplication) {
                return res.status(400).json({ message: 'Заявка с таким email уже существует.' });
            }

            const hashedPassword = await bcrypt.hash(password, saltRounds); // Хэширование!

            const newApplication = await StaffApplication.create({
                email,
                password: hashedPassword,  // Сохраняем ХЭШ!
                first_name,
                last_name,
                phone_number,
            });

            res.status(201).json({ message: 'Заявка на регистрацию успешно создана.' });
        } catch (error) {
            console.error('Ошибка при создании заявки:', error);
            res.status(500).json({ message: 'Ошибка сервера при создании заявки.' });
        }
    }

    static async loginClient(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: 'Email и пароль обязательны.' });
            }

            const client = await Client.findOne({ where: { email } });

            if (!client) {
                return res.status(401).json({ message: 'Неверный email или пароль.' });
            }

            const isPasswordValid = await bcrypt.compare(password, client.password); // Ключевое место

            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Неверный email или пароль.' });
            }

            const token = jwt.sign({ userId: client.client_id, role: 'client' }, secretKey, { expiresIn: '1h' });

            res.status(200).json({ message: 'Вход выполнен успешно', token });
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

            const staff = await Staff.findOne({
                where: { email },
                include: [{ model: StaffPermissions, as: 'staff_permissions' }], // Включаем StaffPermissions
            });

            if (!staff) {
                return res.status(401).json({ message: 'Неверный email или пароль.' });
            }

            const isPasswordValid = await bcrypt.compare(password, staff.password);

            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Неверный email или пароль.' });
            }

            const token = jwt.sign(
                {
                    userId: staff.staff_id,
                    role: {
                        admin: staff.staff_permissions.is_admin,
                        moderator: staff.staff_permissions.is_moderator,
                        staff: staff.staff_permissions.is_staff,
                    },
                },
                secretKey,
                { expiresIn: '1h' }
            );

            res.status(200).json({ message: 'Вход выполнен успешно', token });
        } catch (error) {
            console.error('Ошибка входа сотрудника:', error);
            res.status(500).json({ message: 'Ошибка сервера при входе сотрудника.' });
        }
    }
}

module.exports = AuthController;