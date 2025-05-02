// extract-categories.js
const fs = require('fs').promises;
const xml2js = require('xml2js');
const path = require('path'); // Добавлено
const iconv = require('iconv-lite');

// Путь к файлу с игнорируемыми словами
const ignoreWordsFilePath = path.join(__dirname, 'ignore_words.txt'); // Укажите путь относительно скрипта

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
    const categories = new Set();
    for (const name of productNames) {
        let category = name;

        // 1. Удаляем все, что идет после первой цифры (включая цифру)
        category = category.replace(/\d.*/, '');

        // 2. Удаляем все, что идет после открывающей скобки с цифрами (включая скобку)
        category = category.replace(/\(\d.*\)/, '');

        // 3. Удаляем все, что идет после открывающей скобки с буквами (оставляем скобку и текст)
        // category = category.replace(/\([A-Za-z].*\)/, '');

        // 4. Удаляем все символы (#, /, и т.д.)
        category = category.replace(/[#\/]/g, '');

        // 5. Удаляем слова из списка игнорирования
        category = category.split(' ').filter(word => !ignoreWords.includes(word.trim())).join(' ');

        // 6. Удаляем лишние пробелы
        category = category.trim();

        categories.add(category);
    }

    return Array.from(categories);
}
// Функция для парсинга XML и извлечения названий товаров
async function processXmlFile(xmlFilePath) {
    try {
        const xmlData = await fs.readFile(xmlFilePath, 'windows1251');
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlData);

        if (!result.root || !result.root.товар) {
            console.error('Не найден элемент <Товар> (или товар) в XML11.');
            return null;
        }

        const productNames = result.root.товар.map(товар => товар.Имя[0]);
        // Извлекаем категории
        const categories = await extractCategories(productNames);
        return categories;

    } catch (error) {
        console.error('Ошибка при обработке XML:', error);
        return null;
    }
}

// Главная функция
async function main() {
    const xmlFilePath = 'path/to/your/products.xml'; // Замените на путь к вашему XML-файлу
    const categories = await processXmlFile(xmlFilePath);

    if (categories) {
        console.log('Извлеченные категории:');
        console.log(categories.join('\n')); // Или запишите в файл
    }
}

main();