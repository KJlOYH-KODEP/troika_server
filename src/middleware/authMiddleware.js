// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();
const secretKey = process.env.JWT_SECRET;



function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Необходима авторизация.' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Неверный токен.' });
        }
        req.user = decoded;
        next();
    });
}

// Универсальная функция авторизации: принимает массив разрешенных ролей
function authorize(allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'Недостаточно прав для доступа к ресурсу.' });
        }

        // Проверяем, есть ли у пользователя хотя бы одна из разрешенных ролей
        const hasPermission = allowedRoles.some(allowedRole => req.user.role[allowedRole] === true); // Изменено

        if (hasPermission) {
            next();
        } else {
            return res.status(403).json({ message: 'Недостаточно прав для доступа к ресурсу.' });
        }
    };
}

module.exports = {
    authenticateToken,
    authorize,  // Экспортируем универсальную функцию
};