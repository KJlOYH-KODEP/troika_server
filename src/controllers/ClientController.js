// src/controllers/ClientController.js
const Client = require('../models/Client');
const bcrypt = require('bcrypt'); // Для сравнения паролей
const jwt = require('jsonwebtoken'); // Для создания токенов (JWT)
const secretKey = process.env.JWT_SECRET || 'secretkey'; // Ключ для подписи JWT (хранить в .env!)

class ClientController {
  static async register(req, res) {
    const { firstName, lastName, email, phone, address, password } = req.body;
    try {
      const client = await Client.create(firstName, lastName, email, phone, address, password);
      res.status(201).json({ message: 'Клиент успешно зарегистрирован', client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        address: client.address
      } }); // Отправляем только нужные данные
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Не удалось зарегистрировать клиента' });
    }
  }

  static async login(req, res) {
    const { email, password } = req.body;
    try {
      const client = await Client.getByEmail(email);
      if (client && await bcrypt.compare(password, client.password)) {
        // Пароль совпадает
        const token = jwt.sign({ clientId: client.id, role: 'client' }, secretKey, { expiresIn: '1h' }); // Создаем токен
        res.status(200).json({ message: 'Успешная аутентификация', token: token, clientId: client.id, role: 'client' });
      } else {
        // Неверный пароль
        res.status(401).json({ message: 'Неверный email или пароль' }); // 401 Unauthorized
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Ошибка аутентификации' });
    }
  }

  // Добавьте методы для получения информации о клиенте, обновления профиля и т.д. (при необходимости)
}

module.exports = ClientController;