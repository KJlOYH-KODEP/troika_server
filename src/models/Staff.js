// src/models/Staff.js
const { Pool } = require('pg');
const bcrypt = require('bcrypt'); // Добавляем bcrypt
const config = require('../config/database');
const pool = new Pool(config);

class Staff {
  constructor(id, firstName, lastName, email, phone, password, positionId) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.phone = phone;
    this.password = password; // Теперь это хеш пароля
    this.positionId = positionId;
  }

  static async getAll() {
    try {
      const result = await pool.query('SELECT * FROM staff');
      return result.rows.map(row => new Staff(
        row.id,
        row.first_name,
        row.last_name,
        row.email,
        row.phone,
        row.password,
        row.position_id
      ));
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  static async getById(id) {
    try {
      const result = await pool.query('SELECT * FROM staff WHERE id = $1', [id]);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return new Staff(
          row.id,
          row.first_name,
          row.last_name,
          row.email,
          row.phone,
          row.password,
          row.position_id
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
      const result = await pool.query('SELECT * FROM staff WHERE email = $1', [email]);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return new Staff(
          row.id,
          row.first_name,
          row.last_name,
          row.email,
          row.phone,
          row.password, // Возвращаем хеш пароля
          row.position_id
        );
      } else {
        return null;
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  static async create(firstName, lastName, email, phone, password, positionId) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10); // Хешируем пароль
      const result = await pool.query(
        'INSERT INTO staff (first_name, last_name, email, phone, password, position_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [firstName, lastName, email, phone, hashedPassword, positionId] // Сохраняем хеш пароля
      );
      const row = result.rows[0];
      return new Staff(
        row.id,
        row.first_name,
        row.last_name,
        row.email,
        row.phone,
        row.password, // Возвращаем хеш пароля (для совместимости, хотя он уже хеширован)
        row.position_id
      );
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}

module.exports = Staff;