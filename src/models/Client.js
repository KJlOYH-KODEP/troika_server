// src/models/Client.js
const { Pool } = require('pg');
const bcrypt = require('bcrypt'); // Добавляем bcrypt
const config = require('../config/database');
const pool = new Pool(config);

class Client {
  constructor(id, firstName, lastName, email, phone, address, password) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.phone = phone;
    this.address = address;
    this.password = password; // Теперь это хеш пароля
  }

  static async getAll() {
    try {
      const result = await pool.query('SELECT * FROM clients');
      return result.rows.map(row => new Client(
        row.id,
        row.first_name,
        row.last_name,
        row.email,
        row.phone,
        row.address,
        row.password
      ));
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  static async getById(id) {
    try {
      const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return new Client(
          row.id,
          row.first_name,
          row.last_name,
          row.email,
          row.phone,
          row.address,
          row.password
        );
      } else {
        return null;
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  static async getByEmail(email) {
    try {
      const result = await pool.query('SELECT * FROM clients WHERE email = $1', [email]);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return new Client(
          row.id,
          row.first_name,
          row.last_name,
          row.email,
          row.phone,
          row.address,
          row.password // Возвращаем хеш пароля
        );
      } else {
        return null;
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  static async create(firstName, lastName, email, phone, address, password) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10); // Хешируем пароль
      const result = await pool.query(
        'INSERT INTO clients (first_name, last_name, email, phone, address, password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [firstName, lastName, email, phone, address, hashedPassword] // Сохраняем хеш пароля
      );
      const row = result.rows[0];
      return new Client(
        row.id,
        row.first_name,
        row.last_name,
        row.email,
        row.phone,
        row.address,
        row.password // Возвращаем хеш пароля (для совместимости, хотя он уже хеширован)
      );
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}

module.exports = Client;