// src/controllers/StaffController.js
const Staff = require('../models/Staff');
const bcrypt = require('bcrypt'); // Для сравнения паролей
const jwt = require('jsonwebtoken'); // Для создания токенов (JWT)
const secretKey = process.env.JWT_SECRET || 'secretkey'; // Ключ для подписи JWT (хранить в .env!)

class StaffController {
  static async register(req, res) {
    const { firstName, lastName, email, phone, password, positionId } = req.body;
    try {
      const staff = await Staff.create(firstName, lastName, email, phone, password, positionId);
      res.status(201).json({ message: 'Сотрудник успешно зарегистрирован', staff: {
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        phone: staff.phone,
        positionId: staff.positionId
      } }); // Отправляем только нужные данные
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Не удалось зарегистрировать сотрудника' });
    }
  }

  static async login(req, res) {
    const { email, password } = req.body;
    try {
      const staff = await Staff.getByEmail(email);
      if (staff && await bcrypt.compare(password, staff.password)) {
        // Пароль совпадает
        const token = jwt.sign({ staffId: staff.id, role: 'staff' }, secretKey, { expiresIn: '1h' }); // Создаем токен
        res.status(200).json({ message: 'Успешная аутентификация', token: token, staffId: staff.id, role: 'staff'});
      } else {
        // Неверный пароль
        res.status(401).json({ message: 'Неверный email или пароль' }); // 401 Unauthorized
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Ошибка аутентификации' });
    }
  }

  // Добавьте методы для получения информации о сотруднике, обновления профиля и т.д. (при необходимости)
}

module.exports = StaffController;