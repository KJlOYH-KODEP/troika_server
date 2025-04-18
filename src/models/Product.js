// src/models/Product.js
const { Pool } = require('pg');
const config = require('../config/database');
const pool = new Pool(config);

class Product {
  constructor(id, name, description, price, categoryId, supplierId, unit, quantity) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.price = price;
    this.categoryId = categoryId;
    this.supplierId = supplierId;
    this.unit = unit;
    this.quantity = quantity;
  }

  static async getAll() {
    try {
      const result = await pool.query('SELECT * FROM products');
      return result.rows.map(row => new Product(
        row.id,
        row.name,
        row.description,
        row.price,
        row.category_id,
        row.supplier_id,
        row.unit,
        row.quantity
      ));
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  static async getById(id) {
    try {
      const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return new Product(
          row.id,
          row.name,
          row.description,
          row.price,
          row.category_id,
          row.supplier_id,
          row.unit,
          row.quantity
        );
      } else {
        return null;
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  static async create(name, description, price, categoryId, supplierId, unit, quantity) {
    try {
      const result = await pool.query(
        'INSERT INTO products (name, description, price, category_id, supplier_id, unit, quantity) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [name, description, price, categoryId, supplierId, unit, quantity]
      );
      const row = result.rows[0];
      return new Product(
        row.id,
        row.name,
        row.description,
        row.price,
        row.category_id,
        row.supplier_id,
        row.unit,
        row.quantity
      );
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  static async update(id, name, description, price, categoryId, supplierId, unit, quantity) {
    try {
      const result = await pool.query(
        'UPDATE products SET name = $1, description = $2, price = $3, category_id = $4, supplier_id = $5, unit = $6, quantity = $7 WHERE id = $8 RETURNING *',
        [name, description, price, categoryId, supplierId, unit, quantity, id]
      );
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return new Product(
          row.id,
          row.name,
          row.description,
          row.price,
          row.category_id,
          row.supplier_id,
          row.unit,
          row.quantity
        );
      } else {
        return null;
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  static async delete(id) {
    try {
      const result = await pool.query('DELETE FROM products WHERE id = $1', [id]);
      return result.rowCount > 0; // Возвращает true, если удаление прошло успешно
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}

module.exports = Product;