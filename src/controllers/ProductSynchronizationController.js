// src/controllers/ProductSynchronizationController.js
const fs = require('fs').promises;
const xml2js = require('xml2js');
const path = require('path');
const iconv = require('iconv-lite');
const { Product, Category, ProductPrice, ProductInventory, PriceType } = require('../models'); // Добавлено
const { db } = require('../config/database');

// Путь к файлу с игнорируемыми словами
const ignoreWordsFilePath = path.join(__dirname, '../../categories_ignore_words.txt'); // Укажите путь относительно скрипта

// Функция для загрузки игнорируемых слов из файла
async function loadIgnoreWords() {
    try {
        const data = await fs.readFile(ignoreWordsFilePath, 'utf8');
        const words = data.split('\n').map(word => word.trim()).filter(word => word !== '');
        return words;
    } catch (error) {
        console.error('Ошибка при загрузке игнорируемых слов:', error);
        return [];
    }
}

// Функция для извлечения категорий из названий товаров
async function extractCategories(productNames) {
    const ignoreWords = await loadIgnoreWords(); // Загружаем игнорируемые слова
    const productCategories = {};

    for (const name of productNames) {
        let category = name;

        category = category.replace(/\d.*/, '');
        category = category.replace(/\(\d.*\)/, '');
        category = category.replace(/[#\/]/g, '');
        category = category.split(' ').filter(word => !ignoreWords.includes(word.trim())).join(' ');
        category = category.trim();

        productCategories[name] = category; // Сохраняем соответствие товар -> категория
    }
    return productCategories; 
}

// Функция для парсинга XML и извлечения названий товаров
async function processXmlFile(xmlFilePath) {
    try {
        // Читаем файл асинхронно
        const xmlBuffer = await fs.readFile(xmlFilePath);

        const xmlData = iconv.decode(xmlBuffer, 'windows-1251');
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlData);

        // Проверяем структуру XML
        if (!result || !result.root || !result.root.Товар) {
            return null;
        }

        const productNames = result.root.Товар.map(товар => товар.Имя[0]);
        // Извлекаем категории
        const productCategories = await extractCategories(productNames);
        const productsWithCategory = result.root.Товар.map(товар => {
            const productName = товар.Имя[0];
            const categoryName = productCategories[productName] || null; // Получаем категорию для товара
            return {
                ...товар,
                categoryName: categoryName // Добавляем название категории к товару
            };
        });
        return {
            categories: [...new Set(Object.values(productCategories))],
            products: productsWithCategory,// Возвращаем товары
            partitionName: result.root['$'].Partition, // Извлечение partitionName
            priceTypeName: result.root['$'].PriceOfType 
        };

    } catch (error) {
        console.error('Ошибка при обработке XML:', error);
        return null;
    }
}

async function createCategories(categories, parentCategory) {
    try {
        for (const categoryName of categories) {
            let category = await Category.findOne({ where: { name: categoryName } });

            if (!category) {
                category = await Category.create({
                    name: categoryName,
                    parent_category_id: parentCategory ? parentCategory.category_id : null, // Устанавливаем parent_category_id
                });
                console.log(`Создана категория: ${categoryName}`);
            } else {
                console.log(`Категория ${categoryName} уже существует.`);
            }
        }
    } catch (error) {
        console.error('Ошибка при создании категорий:', error);
        throw error;
    }
}

async function syncProducts(products, priceTypeName, officeId) {
    try {
        // Получаем или создаем price_type_id по имени priceTypeName
        let priceType = await PriceType.findOne({ where: { name: priceTypeName } });

        if (!priceType) {
            priceType = await PriceType.create({ name: priceTypeName });
            console.log(`Создан тип цены: ${priceTypeName}`);
        }

        // Извлекаем уникальные названия категорий из товаров
        const categoryNames = [...new Set(products.map(product => product.categoryName).filter(Boolean))];

        // Получаем все категории одним запросом
        const categories = await Category.findAll({
            where: {
                name: categoryNames // Находим категории с названиями из XML
            }
        });

        // Создаем объект для быстрого поиска категории по названию
        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat.name] = cat; // Сохраняем, чтобы потом по названию найти
        });

        for (const товар of products) {
            const article = товар.Артикул[0];
            const name = товар.Имя[0];
            const price = parseFloat(товар.Цена[0]);
            const quantity = parseInt(товар.Количество[0]);
            const categoryName = товар.categoryName;
            // Находим категорию по названию (используем categoryMap)
            const category = categoryMap[categoryName] || null; // Устанавливаем category в null, если категория не найдена
            // Поиск существующего товара по артикулу
            let product = await Product.findOne({ where: { article: article } });

            if (product) {
                // Обновляем существующий товар
                product.name = name;
                //  product.category_id = category ? category.category_id : null; // Обновляем category_id
                await product.save();
                console.log(`Товар "${name}" обновлен.`);

                // Обновляем количество на складе
                await ProductInventory.update({
                    quantity: quantity
                }, {
                    where: {
                        product_id: product.product_id,
                        office_id: officeId
                    }
                });
                // Обновляем цену товара
                await ProductPrice.update({
                    price: price
                }, {
                    where: {
                        product_id: product.product_id,
                        price_type_id: priceType.price_type_id
                    }
                });
            } else {
                // Создаем новый товар
                product = await Product.create({
                    article,
                    name,
                    description: '',
                    image_source: 'no',
                    category_id: category ? category.category_id : null, // Устанавливаем category_id
                });

                // Создаем запись в ProductInventory
                await ProductInventory.create({
                    product_id: product.product_id,
                    office_id: officeId,
                    quantity,
                });

                // Создаем запись в ProductPrice
                await ProductPrice.create({
                    product_id: product.product_id,
                    price,
                    price_type_id: priceType.price_type_id,
                    data_s: new Date(),
                    data_e: null,
                });
                console.log(`Товар "${name}" создан.`);
            }
        }
    } catch (error) {
        console.error('Ошибка при синхронизации товаров:', error);
        throw error;
    }
}

class ProductSynchronizationController {
    static async syncProductsFromXml(req, res) {
        console.log(req.method, req.url);
        console.log(req.files);

        const { officeId } = req.body; // Получаем officeId из тела запроса
        if (!officeId) {
            return res.status(400).json({ message: 'Необходимо указать officeId в теле запроса.' });
        }

        if (!req.files || !req.files.xmlFile) {
            return res.status(400).json({ message: 'Необходимо загрузить XML файл.' });
        }

        const xmlFile = req.files.xmlFile;
        const tempFilePath = path.join(__dirname, '../../temp/', xmlFile.name);
        console.log('Файл сохранен по пути:', tempFilePath);

        try {
            // Сохраняем файл во временную папку
            await xmlFile.mv(tempFilePath);

            const result = await processXmlFile(tempFilePath);
            await fs.unlink(tempFilePath); // Удаляем временный файл

            if (!result) {
                console.error("processXmlFile returned null.");
                return res.status(500).send({ message: 'Ошибка при обработке XML' });
            }

            const { categories, products, partitionName, priceTypeName } = result;
            console.log("Родительская категория", partitionName)
             // Ищем или создаем родительскую категорию
             let parentCategory = await Category.findOne({ where: { name: partitionName } });
             if (!parentCategory) {
               parentCategory = await Category.create({ name: partitionName });
               console.log(`Создана родительская категория: ${partitionName}`);
             }
         
            //  await createCategories(categories);
             await createCategories(categories, parentCategory);  // Передаем родительскую категорию

             // Запускаем асинхронную функцию для добавления/обновления товаров
             await syncProducts(products, priceTypeName, officeId); // Передаем priceTypeName
         
            res.status(200).json({ message: 'XML обработан. Категории и товары синхронизированы.' });

        } catch (error) {
            console.error('Ошибка при синхронизации товаров из XML:', error);
            res.status(500).json({ message: 'Ошибка при синхронизации товаров из XML.' });
        }
    }

    
    static async uploadProductImage(req, res) {
        try {
            const { article, type } = req.params; // type: 'own' or 'category'

            // Check if product exists
            const product = await Product.findOne({ where: { article } });

            if (!product) {
                return res.status(404).json({ message: 'Артикул не найден.' });
            }

            // Use the `upload` middleware to handle the file upload.
            upload.single('image')(req, res, async (err) => { // 'image' is the field name in the form
                if (err) {
                    console.error('Ошибка загрузки изображения:', err);
                    return res.status(500).json({ message: 'Ошибка загрузки изображения.' });
                }

                // File uploaded successfully.  Now update the image_source in the database.
                let imagePath = `img/${type === 'category' ? 'categories' : 'products'}/${article}.jpg`;
                //  (или `${req.file.path}` если вам нужен полный путь).

                await product.update({ image_source: imagePath }); // Assuming image_source stores the path
                return res.status(200).json({ message: 'Изображение успешно загружено и связано с продуктом.', imagePath });
            });

        } catch (error) {
            console.error('Ошибка загрузки изображения:', error);
            res.status(500).json({ message: 'Ошибка сервера при загрузке изображения.' });
        }
    }

    static async setImageStatuses(req, res) {
        try {
            const products = await Product.findAll(); // Получаем все товары из базы данных

            for (const product of products) {
                const imagePath = path.join(__dirname, '..', 'img', 'products', `${product.article}.jpg`); // Путь к изображению товара
                try {
                    await fs.access(imagePath); // Пробуем получить доступ к файлу (проверяем, существует ли файл)
                    if (product.image_source !==  `img/products/${product.article}.jpg`) {
                        await product.update({ image_source: `img/products/${product.article}.jpg` });
                    }
                } catch (error) {
                   // If the image file does not exist, set image_source to 'no'
                   if (product.image_source !== 'no') {
                     await product.update({ image_source: 'no' });
                   }
                }
            }

            res.status(200).json({ message: 'Статусы изображений успешно обновлены.' });
        } catch (error) {
            console.error('Ошибка при обновлении статусов изображений:', error);
            res.status(500).json({ message: 'Ошибка сервера при обновлении статусов изображений.' });
        }
    }

    // Helper function to check and set image status (you can reuse this)
    static async checkAndSetImageStatus(article, image_source) { // image_source - название изображения, а не путь
        try {
            if (!image_source || image_source === 'no') {
                return; // If image_source is missing or 'no', skip
            }

           const imagePath = path.join(__dirname, '..', 'img', 'products', `${article}.jpg`);
            try {
                await fs.access(imagePath); // Check if the image file exists
                // If the file exists, it means the image is available. If  image_source does not correspond to the file, we update it

                if (image_source !== `img/products/${article}.jpg`) { // `img/products/${article}.jpg` - путь к картинке
                   await Product.update({ image_source: `img/products/${article}.jpg` }, { where: { article } });
                }


            } catch (error) {
                // If the file does not exist, set image_source to 'no'
               await Product.update({ image_source: 'no' }, { where: { article } });
            }
        } catch (error) {
            console.error('Ошибка при проверке и установке статуса изображения:', error);
        }
    }
}

module.exports = ProductSynchronizationController;