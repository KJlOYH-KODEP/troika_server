const { DataTypes } = require('sequelize');
const { db } = require('../config/database');

const orderStatuses = ['Новый', 'В обработке', 'В доставке', 'Выполнен', 'Отменен'];
const deliveryMethods = ['Самовывоз', 'Доставка'];
const paymentMethods = ['Оплата при получении', 'Онлайн'];

const Order = db.define('Order', {
    order_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    public_order_id: {
        type: DataTypes.STRING(4),
        allowNull: false,
        unique: true, 
    },
    client_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'clients',
            key: 'client_id',
        }
    },
    order_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    status: {
        type: DataTypes.ENUM(...orderStatuses),
        allowNull: false,
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    delivery_method: {
        type: DataTypes.ENUM(...deliveryMethods),
        allowNull: false,
    },
    payment_method: {
        type: DataTypes.ENUM(...paymentMethods),
        allowNull: false,
    },
    comment: {
        type: DataTypes.TEXT,
    },
    office_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'offices',
            key: 'office_id',
        }
    },
    last_change: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'orders',
    timestamps: false,
    hooks: {
        beforeValidate: async (order) => { // Хук для генерации ID
            if (!order.public_order_id) {
                let code = generatePublicOrderId();
                let isUnique = false;
                while (!isUnique) {
                    const existingOrder = await Order.findOne({ where: { public_order_id: code } });
                    if (!existingOrder) {
                        isUnique = true;
                    } else {
                        code = generatePublicOrderId();
                    }
                }
                order.public_order_id = code;
            }
        }
    }
});

function generatePublicOrderId() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

module.exports = Order;