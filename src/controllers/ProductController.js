const Product = require('../models/Product');

class ProductController {
  static async getAllProducts(req, res) {
    try {
      const products = await Product.getAll();
      res.status(200).json(products); // 200 OK
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Не удалось получить список товаров' }); // 500 Internal Server Error
    }
  }

  static async getProductById(req, res) {
    const id = req.params.id;
    try {
      const product = await Product.getById(id);
      if (product) {
        res.status(200).json(product);
      } else {
        res.status(404).json({ message: 'Товар не найден' }); // 404 Not Found
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Не удалось получить товар' });
    }
  }

  static async createProduct(req, res) {
    const { name, description, price, categoryId, supplierId, quantity } = req.body;
    try {
      const product = await Product.create(name, description, price, categoryId, supplierId, quantity);
      res.status(201).json(product); // 201 Created
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Не удалось создать товар' });
    }
  }

  // Добавьте методы для обновления и удаления товаров
}

module.exports = ProductController;