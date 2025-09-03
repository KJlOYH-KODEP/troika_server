// src/controllers/StaffController.js
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const Staff = require('../models/Staff');
const StaffPermissions = require('../models/StaffPermissions');
const { db } = require('../config/database');


const { getPaginationParams } = require('../utils/pagination');

class StaffController {
    static async getAllStaff(req, res) {
        const { limit, offset } = getPaginationParams(req);

        try {
            const staff = await Staff.findAll({
                attributes: { 
                    exclude: ['password', 'permission_id'],
                 }, // Не возвращаем пароли и id ролей
                include: {
                    model: StaffPermissions,
                    as: 'role',
                    attributes: {
                        exclude: ['permission_id','is_admin','is_moderator','is_staff'],
                        include: [['is_admin', 'admin'],['is_moderator','moderator'],['is_staff','staff']]
                    }
                },
                limit,
                offset
            });
            res.status(200).json(staff);
        } catch (error) {
            console.error('Ошибка при получении списка персонала:', error);
            res.status(500).json({ message: 'Ошибка сервера при получении списка персонала.' });
        }
    }

    static async getStaffById(req, res) {
        const { staffId } = req.params;
        if (staffId != req.user.user_id && !req.user.role.admin) {
            return res.status(403).json({ message: 'Нет права доступа.' });
        }
        try {
            const staff = await Staff.findByPk(staffId, {
                attributes: { 
                    exclude: ['password','permission_id'],
                },
                include: {
                    model: StaffPermissions,
                    as: 'role',
                    attributes: {
                        exclude: ['permission_id','is_admin','is_moderator','is_staff'],
                        include: [['is_admin', 'admin'],['is_moderator','moderator'],['is_staff','staff']]
                    }
                }
            });
            if (!staff) {
                return res.status(404).json({ message: 'Сотрудник не найден.' });
            }
            res.status(200).json(staff);
        } catch (error) {
            console.error('Ошибка при получении информации о сотруднике:', error);
            res.status(500).json({ message: 'Ошибка сервера при получении информации о сотруднике.' });
        }
    }
    
    static async updateCredentials(req, res) {
        const { email, password, phone_number } = req.body;
        const staffId = req.user.staffId; // Assuming you have staff info in req.user

        if (!email && !password && !phone_number) {
            return res.status(400).json({ message: 'Необходимо указать хотя бы одно поле для изменения.' });
        }

        try {
            const staff = await Staff.findByPk(staffId);
            if (!staff) {
                return res.status(404).json({ message: 'Сотрудник не найден.' });
            }

            if (email) {
                staff.email = email;
            }
            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                staff.password = hashedPassword;
            }
            if (phone_number) {
                staff.phone_number = phone_number;
            }

            await staff.save();

            res.status(200).json({ message: 'Учетные данные сотрудника успешно обновлены.' });
        } catch (error) {
            console.error('Ошибка при обновлении учетных данных сотрудника:', error);
            res.status(500).json({ message: 'Ошибка сервера при обновлении учетных данных сотрудника.' });
        }
    }

    static async registerStaff(req, res) {
        try {
            const { email, password, first_name, last_name, phone_number, role, office_id } = req.body; // Добавляем role
            if (!email || !password || !first_name || !last_name || !phone_number || !role || !office_id) {
                return res.status(400).json({ message: 'Все поля обязательны.' });
            }
            const existingStaff = await Staff.findOne({ where: { email } });
            if (existingStaff) {
                return res.status(400).json({ message: 'Сотрудник с таким email уже существует.' });
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Определяем роли
            const isAdmin = role.admin;
            const isModerator = role.moderator;
            const isStaff = role.staff;

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
                office_id: office_id,
            });
            res.status(201).json({ message: 'Сотрудник успешно зарегистрирован.' });
        } catch (error) {
            console.error('Ошибка регистрации сотрудника:', error);
            res.status(500).json({ message: 'Ошибка сервера при регистрации сотрудника.' });
        }
    }

    static async updateStaffData(req, res) {
        const transaction = await db.transaction();
        try {
            const { staffId } = req.params;
            const { role, first_name, last_name, email, phone_number, office_id } = req.body;

            const staff = await Staff.findByPk(staffId, { transaction });

            if (!staff) {
                return res.status(404).json({ message: 'Сотрудник не найден.' });
            }

            // Обновление информации о сотруднике
            const updateData = {};

            if (first_name !== undefined) {
                updateData.first_name = first_name;
            }
            if (last_name !== undefined) {
                updateData.last_name = last_name;
            }
            if (email !== undefined) {
                updateData.email = email;
            }
            if (phone_number !== undefined) {
                updateData.phone_number = phone_number;
            }
            if (office_id !== undefined) {
                updateData.office_id = office_id;
            }

            // Обновление роли сотрудника (логика из вашего исходного кода)
            if (role !== undefined) { //  Проверка, что роль вообще пришла в запросе
                if (role.admin) {
                    return res.status(400).json({ message: 'Администраторов создавать запрещено.' });
                }

                let permissions = await StaffPermissions.findOne({
                    where: {
                        is_admin: false,
                        is_moderator: role.moderator,
                        is_staff: role.staff,
                    },
                });

                if (!permissions) {
                    permissions = await StaffPermissions.create({
                        is_admin: false,
                        is_moderator: role.moderator,
                        is_staff: role.staff,
                    }, { transaction }); // Важно передать transaction при создании
                }
                updateData.permission_id = permissions.permission_id;
            }
        
            if (Object.keys(updateData).length > 0) {
                await staff.update(updateData, { transaction });
            }

            await transaction.commit();
            res.status(200).json({ message: 'Информация о сотруднике обновлена.' });

        } catch (error) {
            await transaction.rollback();
            console.error('Ошибка при обновлении информации о сотруднике:', error);
            res.status(500).json({ message: 'Ошибка сервера при обновлении информации о сотруднике.' });
        }
    }
    
    static async deleteStaff(req, res) {
    const transaction = await db.transaction();
    try {
        const { staffId } = req.params;

        // Проверяем, существует ли сотрудник
        const staff = await Staff.findByPk(staffId, { transaction });
        if (!staff) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Сотрудник не найден.' });
        }

        // Проверяем, не пытаемся ли удалить самого себя
        if (req.user && req.user.staffId === parseInt(staffId)) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Вы не можете удалить самого себя.' });
        }

        // Удаляем сотрудника
        await staff.destroy({ transaction });
        
        // Если нужно, можно также удалить связанные записи:
        // await SomeRelatedModel.destroy({ where: { staff_id: staffId }, transaction });

        await transaction.commit();
        res.status(200).json({ message: 'Сотрудник успешно удален.' });
    } catch (error) {
        await transaction.rollback();
        console.error('Ошибка при удалении сотрудника:', error);
        res.status(500).json({ message: 'Ошибка сервера при удалении сотрудника.' });
    }
    }
}

module.exports = StaffController;