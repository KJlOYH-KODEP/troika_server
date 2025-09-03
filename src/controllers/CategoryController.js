// src/controllers/CategoryController.js
const Category = require('../models/Category');

class CategoryController {
    static async getCategories(req, res) {
        try {
            // Сначала получаем все категории одним запросом
            const allCategories = await Category.findAll({
                attributes: ['category_id', 'name', 'parent_category_id'],
                order: [['category_id', 'ASC']],
            });
    
            // Функция для построения дерева категорий
            const buildCategoryTree = (parentId = null) => {
                return allCategories
                    .filter(category => category.parent_category_id === parentId)
                    .map(category => {
                        const children = buildCategoryTree(category.category_id);
                        return {
                            category_id: category.category_id,
                            name: category.name,
                            parent_category_id: category.parent_category_id,
                            children: children.length ? children : undefined
                        };
                    });
            };
    
            // Строим полное дерево категорий
            const categoryTree = buildCategoryTree(null);
    
            res.json(categoryTree);
        } catch (error) {
            console.error('Ошибка при получении категорий:', error);
            res.status(500).json({ message: 'Ошибка сервера при получении категорий.' });
        }
    }
    
    static async getCategoryImage(req, res) {
        const { categoryId } = req.params;

        try {
            const category = await Category.findByPk(categoryId);

            if (!category) {
                return res.status(404).json({ message: 'Категория не найдена' });
            }

            const jpgPath = path.join(__dirname, `../../public/images/categories/${category.category_id}.jpg`);
            const pngPath = path.join(__dirname, `../../public/images/categories/${category.category_id}.png`);

            let imagePath;
            try {
                await fs.access(jpgPath);
                imagePath = `/images/categories/${category.category_id}.jpg`;
            } catch {
                try {
                    await fs.access(pngPath);
                    imagePath = `/images/categories/${category.category_id}.png`;
                } catch {
                    return res.status(404).json({ message: 'Изображение не найдено' });
                }
            }

            res.status(200).json({ imagePath });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при получении изображения категории.' });
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