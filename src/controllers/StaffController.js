// src/controllers/StaffController.js
const bcrypt = require('bcrypt');
const Staff = require('../models/Staff');
const StaffApplication = require('../models/StaffApplication');

class StaffController {
    static async getAllStaff(req, res) {
        try {
            const staff = await Staff.findAll({
                attributes: { exclude: ['password'] } // Не возвращаем пароли
            });
            res.status(200).json(staff);
        } catch (error) {
            console.error('Ошибка при получении списка персонала:', error);
            res.status(500).json({ message: 'Ошибка сервера при получении списка персонала.' });
        }
    }

    static async getStaffById(req, res) {
        const { staffId } = req.params;
        try {
            const staff = await Staff.findByPk(staffId, {
                attributes: { exclude: ['password'] } // Не возвращаем пароли
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

    static async approveStaffApplication(req, res) {
        try {
            const { applicationId } = req.params;
            const { role } = req.body; // Получаем роли из тела запроса
    
            if (!applicationId) {
                return res.status(400).json({ message: 'Не указан ID заявки.' });
            }
    
            if (!role || !Array.isArray(role) || role.length === 0) {
                return res.status(400).json({ message: 'Не указаны роли.' });
            }
    
            const staffApplication = await Staff.findByPk(applicationId);
            if (!staffApplication) {
                return res.status(404).json({ message: 'Заявка не найдена.' });
            }
    
            // Проверяем, что пользователь еще не был одобрен
            if (staffApplication.permission_id) {
              return res.status(400).json({ message: 'Заявка уже одобрена.' });
            }
    
            // Определяем роли
            const isAdmin = role.includes('admin');
            const isModerator = role.includes('moderator');
            const isStaff = true;
    
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
    
            // Обновляем запись сотрудника, добавляя permission_id
            staffApplication.permission_id = permissions.permission_id;
            await staffApplication.save();
    
            res.status(201).json({ message: 'Заявка одобрена и сотрудник создан.' });
    
        } catch (error) {
            console.error('Ошибка при одобрении заявки:', error);
            res.status(500).json({ message: 'Ошибка сервера при одобрении заявки.' });
        }
    }

    static async rejectStaffApplication(req, res) {
        const { applicationId } = req.params;

        try {
            const application = await StaffApplication.findByPk(applicationId);

            if (!application) {
                return res.status(404).json({ message: 'Заявка не найдена.' });
            }

            await application.destroy();
            res.status(200).json({ message: 'Заявка отклонена.' });
        } catch (error) {
            console.error('Ошибка при отклонении заявки:', error);
            res.status(500).json({ message: 'Ошибка сервера при отклонении заявки.' });
        }
    }

    static async updateStaffRole(req, res) {
        const { staffId } = req.params;
        const { role } = req.body;

        if (!['admin', 'staff'].includes(role)) {
            return res.status(400).json({ message: 'Неверная роль.' });
        }

        try {
            const staff = await Staff.findByPk(staffId);

            if (!staff) {
                return res.status(404).json({ message: 'Сотрудник не найден.' });
            }

            await staff.update({ role });
            res.status(200).json({ message: 'Роль сотрудника обновлена.' });
        } catch (error) {
            console.error('Ошибка при обновлении роли сотрудника:', error);
            res.status(500).json({ message: 'Ошибка сервера при обновлении роли сотрудника.' });
        }
    }

    static async getStaffApplications(req, res) {
        try {
            const applications = await StaffApplication.findAll();
            res.status(200).json(applications);
        } catch (error) {
            console.error('Ошибка при получении заявок на регистрацию:', error);
            res.status(500).json({ message: 'Ошибка сервера при получении заявок на регистрацию.' });
        }
    }
}

module.exports = StaffController;