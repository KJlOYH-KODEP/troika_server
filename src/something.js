// const bcrypt = require('bcrypt');

// async function generateHashedPassword(password) {
//     const saltRounds = 10; // Количество раундов для хэширования
//     try {
//         const hashedPassword = await bcrypt.hash(password, saltRounds);
//         return hashedPassword;
//     } catch (error) {
//         console.error('Ошибка при хэшировании пароля:', error);
//         return null;
//     }
// }

// async function main() {
//     const passwordToHash = '123456';
//     const hashedPassword = await generateHashedPassword(passwordToHash);

//     if (hashedPassword) {
//         console.log(`Хэшированный пароль для "${passwordToHash}": ${hashedPassword}`);
//     }
// }

// main();
require('dotenv').config();
const bcrypt = require('bcrypt');
const Staff = require('./models/Staff'); // Укажите правильные пути к моделям
const StaffPermissions = require('./models/StaffPermissions');
const { db } = require('./config/database'); // Укажите путь к вашему конфигу базы данных

async function createAdmin() {
    try {
        await db.sync();  // Синхронизируем модели с базой данных

        const adminEmail = 'testAdmin@gmail.com';
        const adminPassword = '123456';

        if (!adminEmail || !adminPassword) {
            console.error('Не указаны EMAIL или PASSWORD админа в .env файле.');
            return;
        }

        // Проверяем, существует ли уже админ
        const existingAdmin = await Staff.findOne({
            where: { email: adminEmail },
        });

        if (existingAdmin) {
            console.log('Админ уже существует.');
            return;
        }

        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Создаем StaffPermissions для админа
        let adminPermissions = await StaffPermissions.findOne({
            where: { is_admin: true },
        });

        if (!adminPermissions) {
            adminPermissions = await StaffPermissions.create({
                is_admin: true,
                is_staff: true,
            });
        }
        // Создаем админа
        await Staff.create({
            email: adminEmail,
            password: hashedPassword,
            first_name: 'Admin',  // или укажите другие значения по умолчанию
            last_name: 'Admin',
            permission_id: adminPermissions.permission_id,
        });

        console.log('Админ успешно создан.');
    } catch (error) {
        console.error('Ошибка при создании админа:', error);
    } finally {
        process.exit();  // Завершаем процесс
    }
}

createAdmin();