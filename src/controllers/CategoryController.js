// src/controllers/CategoryController.js
const Category = require('../models/Category');

class CategoryController {
    static async getCategories(req, res) {
        try {
            const categories = await Category.findAll({
                include: [{
                    model: Category,
                    as: 'children',
                    attributes: ['category_id', 'name'],
                }],
                where: {
                    parent_category_id: null
                },
                order: [['category_id', 'ASC']],
            });

            res.json(categories);
        } catch (error) {
            console.error('Ошибка при получении категорий:', error);
            res.status(500).json({ message: 'Ошибка сервера при получении категорий.' });
        }
    }

    static async createCategory(req, res) {
        try {
            const { name, parent_category_id } = req.body;

            const newCategory = await Category.create({
                name,
                parent_category_id,
            });

            res.status(201).json(newCategory);
        } catch (error) {
            console.error('Ошибка при создании категории:', error);
            res.status(500).json({ message: 'Ошибка сервера при создании категории.' });
        }
    }

    static async updateCategory(req, res) {
        const { categoryId } = req.params;
        const { name, parent_category_id } = req.body;

        try {
            const category = await Category.findByPk(categoryId);

            if (!category) {
                return res.status(404).json({ message: 'Категория не найдена' });
            }

            await category.update({
                name,
                parent_category_id,
            });

            res.json(category);
        } catch (error) {
            console.error('Ошибка при обновлении категории:', error);
            res.status(500).json({ message: 'Ошибка сервера при обновлении категории.' });
        }
    }

    static async deleteCategory(req, res) {
        const { categoryId } = req.params;

        try {
            const category = await Category.findByPk(categoryId);

            if (!category) {
                return res.status(404).json({ message: 'Категория не найдена' });
            }

            await category.destroy();

            res.status(204).send();
        } catch (error) {
            console.error('Ошибка при удалении категории:', error);
            res.status(500).json({ message: 'Ошибка сервера при удалении категории.' });
        }
    }
}

module.exports = CategoryController;