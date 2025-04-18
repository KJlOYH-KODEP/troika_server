// src/server.js
const app = require('./app');
const port = process.env.PORT || 3000;
const { Pool } = require('pg'); // Импортируем Pool
const config = require('./config/database'); // Импортируем настройки

const pool = new Pool(config); // Создаем пул соединений

async function testDatabaseConnection() {
  try {
    const result = await pool.query('SELECT NOW()'); // Простой запрос
    console.log('Database connection successful:', result.rows[0]);
  } catch (err) {
    console.error('Database connection failed:', err);
  }
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  testDatabaseConnection(); // Вызываем функцию для проверки подключения
});