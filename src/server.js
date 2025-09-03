// src/server.js
const app = require('./app');
const { db } = require('./config/database');
const port = process.env.PORT || 3000;
const models = require('./models'); 

async function startServer() {
    try {
        // Синхронизируем модели с базой данных (создаем таблицы, если их нет)
        await db.sync();
        console.log('Database synced.');

        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error('Error starting server:', error);
    }
}

startServer();