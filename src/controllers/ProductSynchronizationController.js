const fs = require('fs').promises;
const xml2js = require('xml2js');
const path = require('path');
const iconv = require('iconv-lite');
const { Product, Category, ProductPrice, ProductInventory, PriceType, ProductDates } = require('../models');
const { db } = require('../config/database');

// Путь к файлу с игнорируемыми словами
const ignoreWordsFilePath = path.join(__dirname, '../../categories_ignore_words.txt');

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
    const ignoreWords = await loadIgnoreWords();
    const productCategories = {};

    const allCategories = [...new Set(productNames.map(name => {
        let category = name.replace(/\d.*/, '')
                          .replace(/\(\d.*\)/, '')
                          .replace(/[#\/]/g, '')
                          .split(' ')
                          .filter(word => !ignoreWords.includes(word.trim()))
                          .join(' ')
                          .trim();
        return category;
    }))];

    const sortedCategories = [...allCategories].sort((a, b) => b.length - a.length);

    for (const name of productNames) {
        let category = name.replace(/\d.*/, '')
                          .replace(/\(\d.*\)/, '')
                          .replace(/[#\/]/g, '')
                          .split(' ')
                          .filter(word => !ignoreWords.includes(word.trim()))
                          .join(' ')
                          .trim();

        let parentCategory = null;
        for (const possibleParent of sortedCategories) {
            if (possibleParent !== category &&
                category.includes(possibleParent) &&
                possibleParent.length > 0) {
                parentCategory = possibleParent;
                break;
            }
        }

        if (parentCategory) {
            const childPart = category.replace(parentCategory, '').trim();
            if (childPart) {
                productCategories[name] = {
                    parent: parentCategory,
                    child: childPart
                };
                continue;
            }
        }

        productCategories[name] = {
            parent: null,
            child: category
        };
    }

    return productCategories;
}

// Функция для парсинга XML и извлечения названий товаров
async function processXmlFile(xmlFilePath) {
    try {
        const xmlBuffer = await fs.readFile(xmlFilePath);
        const xmlData = iconv.decode(xmlBuffer, 'windows-1251');
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlData);

        if (!result || !result.root || !result.root.Товар) {
            return null;
        }

        const partitionName = result.root['$'].Partition || 'Без категории';
        const priceTypeName = result.root['$'].PriceOfType || 'Базовая цена';
        const productDataS = result.root['$'].DataS;
        const productDataE = result.root['$'].DataE;

        const productNames = result.root.Товар.map(товар => товар.Имя[0]);
        const productCategories = await extractCategories(productNames);
        
        return {
            partitionName,
            priceTypeName,
            productDataS,
            productDataE,
            products: result.root.Товар.map(товар => ({
                ...товар,
                categoryInfo: productCategories[товар.Имя[0]] || { parent: null, child: null }
            }))
        };
    } catch (error) {
        console.error('Ошибка при обработке XML:', error);
        return null;
    }
}

function parseDottedDate(dateStr) {
    const [day, month, year] = dateStr.split('.');
    // monthIndex = месяц - 1 (так как месяцы в JS от 0 до 11)
    return new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day));
}

class ProductSynchronizationController {
    static async importProductsFromXml(req, res) {
        const transaction = await db.transaction();
        try {
            const { office_id } = req.body;
            if (!office_id) {
                await transaction.rollback();
                return res.status(400).json({ message: 'Необходимо указать office_id' });
            }

            if (!req.files?.xmlFile) {
                await transaction.rollback();
                return res.status(400).json({ message: 'Необходимо загрузить XML файл' });
            }

            const xmlFile = req.files.xmlFile;
            const tempFilePath = path.join(__dirname, '../../temp/', xmlFile.name);

            // Кодируем имя файла
            const decodedName = decodeURIComponent(xmlFile.name);
            await xmlFile.mv(tempFilePath);
            const result = await processXmlFile(tempFilePath);
            await fs.unlink(tempFilePath);

            if (!result) {
                await transaction.rollback();
                return res.status(500).json({ message: 'Ошибка обработки XML' });
            }

            const { products, partitionName, priceTypeName, productDataS, productDataE } = result;

            const [rootCategory] = await Category.findOrCreate({
                where: { name: partitionName, parent_category_id: null },
                defaults: { name: partitionName },
                transaction
            });

            const categoryMap = {};
            for (const товар of products) {
                const { parent, child } = товар.categoryInfo;

                if (parent && child) {
                    const [parentCategory] = await Category.findOrCreate({
                        where: {
                            name: parent,
                            parent_category_id: rootCategory.category_id
                        },
                        defaults: {
                            name: parent,
                            parent_category_id: rootCategory.category_id
                        },
                        transaction
                    });

                    const fullName = `${parent} ${child}`;
                    if (!categoryMap[fullName]) {
                        const [childCategory] = await Category.findOrCreate({
                            where: {
                                name: fullName,
                                parent_category_id: parentCategory.category_id
                            },
                            defaults: {
                                name: fullName,
                                parent_category_id: parentCategory.category_id
                            },
                            transaction
                        });
                        categoryMap[fullName] = childCategory.category_id;
                    }
                } else if (child) {
                    if (!categoryMap[child]) {
                        const [category] = await Category.findOrCreate({
                            where: {
                                name: child,
                                parent_category_id: rootCategory.category_id
                            },
                            defaults: {
                                name: child,
                                parent_category_id: rootCategory.category_id
                            },
                            transaction
                        });
                        categoryMap[child] = category.category_id;
                    }
                }
            }

            const [priceType] = await PriceType.findOrCreate({
                where: { name: priceTypeName },
                transaction
            });

            for (const товар of products) {
                const article = товар.Артикул?.[0]?.trim();
                const name = товар.Имя?.[0]?.trim();
                const price = parseFloat(товар.Цена?.[0] || 0);
                const quantity = parseFloat(товар.Количество?.[0] || 0);

                if (!article || !name) continue;

                let categoryId = rootCategory.category_id;
                const { parent, child } = товар.categoryInfo;

                if (parent && child) {
                    const fullName = `${parent} ${child}`;
                    categoryId = categoryMap[fullName] || rootCategory.category_id;
                } else if (child) {
                    categoryId = categoryMap[child] || rootCategory.category_id;
                }

                const [product] = await Product.findOrCreate({
                    where: { article },
                    defaults: {
                        article,
                        name,
                        description: '',
                        category_id: categoryId
                    },
                    transaction
                });

                const dataS = parseDottedDate(productDataS) || new Date();
                const dataE = parseDottedDate(productDataE) || new Date();

                const [productDates] = await ProductDates.findOrCreate({
                    where: {
                        data_s: dataS,
                        data_e: dataE
                    },
                    transaction
                });

                const [inventory, created] = await ProductInventory.findOrCreate({
                    where: {
                        product_id: product.product_id,
                        office_id: office_id
                    },
                    defaults: {
                        quantity: quantity,
                        product_dates_id: productDates.product_dates_id
                    },
                    transaction
                });

                if (!created) {
                    await inventory.update({ quantity: quantity, product_dates_id: productDates.product_dates_id }, { transaction });
                }

                const [productPrice, priceCreated] = await ProductPrice.findOrCreate({
                    where: {
                        product_id: product.product_id,
                        price_type_id: priceType.price_type_id
                    },
                    defaults: {
                        price: price,
                        product_dates_id: productDates.product_dates_id
                    },
                    transaction
                });

                if (!priceCreated) {
                    await productPrice.update({ price: price, product_dates_id: productDates.product_dates_id }, { transaction });
                }
            }

            // Проверка неиспользуемых дат
            const usedDatesIds = new Set();

            const inventoryDates = await ProductInventory.findAll({
                attributes: ['product_dates_id'],
                where: { office_id },
                transaction,
            });
            inventoryDates.forEach(item => {
                if (item.product_dates_id) usedDatesIds.add(item.product_dates_id);
            });

            // Получаем все product_dates_id из ProductPrice
            const priceDates = await ProductPrice.findAll({
                attributes: ['product_dates_id'],
                where: { price_type_id: priceType.price_type_id },
                transaction,
            });
            priceDates.forEach(item => {
                if (item.product_dates_id) usedDatesIds.add(item.product_dates_id);
            });

            // Удаляем неиспользуемые записи из ProductDates
            await ProductDates.destroy({
                where: {
                    product_dates_id: {
                        [db.Sequelize.Op.notIn]: Array.from(usedDatesIds),
                    },
                },
                transaction,
            });

            await transaction.commit();
            return res.status(200).json({ message: 'Синхронизация успешно завершена' });

        } catch (error) {
            await transaction.rollback();
            console.error('Ошибка синхронизации:', error);

            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({
                    message: 'Обнаружены дубликаты артикулов',
                    details: error.errors.map(err => ({
                        value: err.value,
                        message: err.message
                    }))
                });
            }

            return res.status(500).json({
                message: 'Ошибка синхронизации',
                error: error.message
            });
        }
    }

    static async exportProductsToXml(req, res) {
        const { category, priceType, dataS, dataE } = req.query;

        if (!category && !priceType) {
            return res.status(400).json({ message: 'Необходимо указать категорию или тип цены' });
        }

        try {
            const categories = category ? [category] : await Category.findAll({ where: { parent_category_id: null } }).then(cats => cats.map(cat => cat.name));
            const priceTypes = priceType ? [priceType] : await PriceType.findAll().then(pts => pts.map(pt => pt.name));

            const exportFiles = [];

            for (const cat of categories) {
                for (const pt of priceTypes) {
                    const products = await Product.findAll({
                        include: [
                            {
                                model: Category,
                                where: { name: cat },
                                required: true
                            },
                            {
                                model: ProductPrice,
                                where: { '$price_type.name$': pt },
                                required: true,
                                include: [
                                    {
                                        model: PriceType,
                                        as: 'price_type'
                                    }
                                ]
                            },
                            {
                                model: ProductInventory,
                                required: true
                            }
                        ],
                        where: {
                            '$ProductPrices.ProductPrice.ProductPriceId$': {
                                [db.Sequelize.Op.in]: db.Sequelize.literal(`(
                                    SELECT product_price_id
                                    FROM product_prices
                                    WHERE product_dates_id IN (
                                        SELECT product_dates_id
                                        FROM product_dates
                                        WHERE data_s <= '${dataE}' AND data_e >= '${dataS}'
                                    )
                                )`)
                            }
                        }
                    });

                    const xmlData = {
                        root: {
                            $: {
                                PriceOfType: pt,
                                Partition: cat,
                                DataS: dataS,
                                DataE: dataE
                            },
                            Товар: products.map(product => ({
                                Имя: product.name,
                                Артикул: product.article,
                                Единица: 'пог. м',
                                Количество: product.ProductInventories[0].quantity,
                                Цена: product.ProductPrices[0].price,
                                Описание: product.description,
                                Изображение: '',
                                Категория: product.Category.name
                            }))
                        }
                    };

                    const builder = new xml2js.Builder();
                    const xmlString = builder.buildObject(xmlData);

                    const fileName = `Export${dataS.replace(/\./g, '')}${cat}.xml`;
                    const filePath = path.join(__dirname, '../../exports/', fileName);
                    await fs.writeFile(filePath, xmlString);

                    exportFiles.push(filePath);
                }
            }

            if (exportFiles.length === 1) {
                res.download(exportFiles[0]);
            } else {
                const archive = await createArchive(exportFiles);
                res.download(archive);
            }

        } catch (error) {
            console.error('Ошибка экспорта:', error);
            res.status(500).json({ message: 'Ошибка экспорта данных' });
        }
    }

    static async uploadProductImage(req, res) {
        const { article, type } = req.params;

        // Проверяем, что файл был загружен
        if (!req.files || !req.files.image) {
            return res.status(400).json({ message: 'Необходимо загрузить изображение' });
        }

        try {
            // Находим товар по артикулу
            const product = await Product.findOne({ where: { article } });
            if (!product) {
                const tempDir = path.join(__dirname, '../../temp');
                await fs.mkdir(tempDir, { recursive: true });

                 // Декодируем имя файла
                const decodedImageName = decodeURIComponent(req.files.image.name);
                await req.files.image.mv(path.join(__dirname, '../../temp', decodedImageName));
                return res.status(404).json({ message: 'Товар не найден' });
            }

            // Получаем загруженный файл
            const image = req.files.image;

             // Декодируем имя файла
            const decodedImageName = decodeURIComponent(req.files.image.name);

            // Определяем путь для сохранения файла
            const imagePath = `../../public/images/${type === 'category' ? 'categories' : 'articles'}/${article}${path.extname(decodedImageName)}`;
            const uploadPath = path.join(__dirname, '../public', imagePath);

            // Перемещаем файл в указанную директорию
            await image.mv(uploadPath);
            try {
                await fs.unlink(path.join(__dirname, '../../temp', decodedImageName));
            } catch (unlinkError) {
                console.error('Ошибка удаления временного файла:', unlinkError);
            }
            res.status(200).json({ message: 'Изображение загружено', imagePath });
        } catch (error) {
            try {
                await fs.unlink(path.join(tempDir, decodedImageName));
            } catch (unlinkError) {
                console.error('Ошибка удаления временного файла:', unlinkError);
            }
            console.error('Ошибка загрузки:', error);
            res.status(500).json({ message: 'Ошибка загрузки изображения' });
        }
    }

    static async setImageStatuses(type) {
        try {
            const publicPath = path.join(__dirname, `../../public/images/${type}`);
            if (type === 'articles') {
                const products = await Product.findAll();
                const validArticles = new Set(products.map(product => product.article));

                const files = await fs.readdir(publicPath);
                await Promise.all(files.map(async file => {
                    const fileName = path.basename(file, path.extname(file));
                    if (!validArticles.has(fileName)) {
                        await fs.unlink(path.join(publicPath, file));
                    }
                }));
            } else if (type === 'categories') {
                const categories = await Category.findAll();
                const validCategoryIds = new Set(categories.map(category => category.name));
                const files = await fs.readdir(publicPath);
                await Promise.all(files.map(async file => {
                    const fileName = path.basename(file, path.extname(file));
                    if (!validCategoryIds.has(fileName)) {
                        await fs.unlink(path.join(publicPath, file));
                    }
                }));
            }
        } catch (error) {
            console.error('Ошибка проверки:', error);
            throw new Error('Ошибка сервера');
        }
    }

    static async checkImagesAvailability(req, res) {
        try {
            const publicPaths = {
                articles: path.join(__dirname, `../../public/images/articles`),
                categories: path.join(__dirname, `../../public/images/categories`)
            };

            for (const type in publicPaths) {
                const publicPath = publicPaths[type];

                if (type === 'articles') {
                    const products = await Product.findAll();
                    const validArticles = new Set(products.map(product => product.article));

                    const files = await fs.readdir(publicPath);
                    await Promise.all(files.map(async file => {
                        const fileName = path.basename(file, path.extname(file));
                        if (!validArticles.has(fileName)) {
                            await fs.unlink(path.join(publicPath, file));
                            console.log(`Удален неиспользуемый файл: ${file} из ${publicPath}`);
                        }
                    }));
                } else if (type === 'categories') {
                    const categories = await Category.findAll();
                    const validCategoryIds = new Set(categories.map(category => category.name.toString()));

                    const files = await fs.readdir(publicPath);
                    await Promise.all(files.map(async file => {
                        const fileName = path.basename(file, path.extname(file));
                        if (!validCategoryIds.has(fileName)) {
                            await fs.unlink(path.join(publicPath, file));
                            console.log(`Удален неиспользуемый файл: ${file} из ${publicPath}`);
                        }
                    }));
                }
            }
            res.status(200).json({ message: 'Изображения проверены' });
        } catch (error) {
            console.error("Ошибка при проверке и удалении изображений:", error);
            res.status(500).json({ message: 'Ошибка сервера при проверке и удалении изображений.', error: error.message });
        }
    }

    static async uploadAndCheckImages(req, res) {
        const { type } = req.params;
        // Проверяем тип изображения
        if (!(type === 'articles' || type === 'categories')) {
            return res.status(400).json({ message: 'Неверный тип изображения' });
        }
        // Проверяем, что файлы были загружены
        if (!req.files || !req.files.images) {
            return res.status(400).json({ message: 'Необходимо загрузить изображение' });
        }

        // Преобразуем в массив, если это один файл
        const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];

        try {
            const tempDir = path.join(__dirname, '../../temp');
            await fs.mkdir(tempDir, { recursive: true });

            // Сохраняем все загруженные файлы во временную директорию
            const uploadedFiles = [];
            for (const image of images) {
                // Декодируем имя файла
                const decodedImageName = decodeURIComponent(image.name);
                const tempPath = path.join(tempDir, decodedImageName);
                await image.mv(tempPath);
                uploadedFiles.push(tempPath);
            }
            // Перемещаем файлы в соответствующую директорию
            const publicDir = path.join(__dirname, `../../public/images/${type}`); // Исправлено category на categorical
            await fs.mkdir(publicDir, { recursive: true });

            for (const tempPath of uploadedFiles) {
                const fileName = path.basename(tempPath);
                const newPath = path.join(publicDir, fileName);
                await fs.rename(tempPath, newPath);
            }

            // Вызываем метод для проверки изображений
            await ProductSynchronizationController.setImageStatuses(type);

            res.status(200).json({ message: 'Изображения загружены и проверены', uploadedFiles });
        } catch (error) {
            console.error('Ошибка загрузки изображений:', error);
            res.status(500).json({ message: 'Ошибка загрузки изображений' });
        }
    }
}

async function createArchive(files) {
    const archiver = require('archiver');
    const archivePath = path.join(__dirname, '../../exports/', 'export.zip');
    const output = fs.createWriteStream(archivePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
        output.on('close', () => resolve(archivePath));
        archive.on('error', err => reject(err));

        archive.pipe(output);

        for (const file of files) {
            archive.file(file, { name: path.basename(file) });
        }

        archive.finalize();
    });
}

module.exports = ProductSynchronizationController;