// src/models/index.js
const { db } = require('../config/database');

// Импортируем все модели
const Category = require('./Category');
const Product = require('./Product');
const Client = require('./Client');
const Office = require('./Office');
const Order = require('./Order');
const OrderAddress = require('./OrderAddress');
const OrderItem = require('./OrderItem');
const PriceType = require('./PriceType');
const ProductInventory = require('./ProductInventory');
const ProductPrice = require('./ProductPrice');
const StaffPermissions = require('./StaffPermissions');
const StaffApplication = require('./StaffApplication');
const Staff = require('./Staff');


// Устанавливаем ассоциации
Category.hasMany(Category, { as: 'children', foreignKey: 'parent_category_id' });
Category.belongsTo(Category, { foreignKey: 'parent_category_id', as: 'parent' });
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'category_id' });

Client.hasMany(Order, { foreignKey: 'client_id', as: 'orders' });
Order.belongsTo(Client, { foreignKey: 'client_id' });

Office.hasMany(Staff, { foreignKey: 'office_id', as: 'staff' });
Office.hasMany(Order, { foreignKey: 'office_id', as: 'orders' });
Office.hasMany(ProductInventory, { foreignKey: 'office_id', as: 'product_inventory' });

Order.belongsTo(Staff, { foreignKey: 'staff_id' });
Order.belongsTo(Office, { foreignKey: 'office_id' });
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'order_items' });
Order.hasOne(OrderAddress, { foreignKey: 'order_id', as: 'shipping_address' });

OrderAddress.belongsTo(Order, { foreignKey: 'order_id' });

OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id' });

PriceType.hasMany(ProductPrice, { foreignKey: 'price_type_id', as: 'product_prices' });

Product.hasMany(ProductPrice, { foreignKey: 'product_id', as: 'prices' });
Product.hasMany(ProductInventory, { foreignKey: 'product_id', as: 'inventory' });

ProductInventory.belongsTo(Product, { foreignKey: 'product_id' });
ProductInventory.belongsTo(Office, { foreignKey: 'office_id' });

ProductPrice.belongsTo(Product, { foreignKey: 'product_id' });
ProductPrice.belongsTo(PriceType, { foreignKey: 'price_type_id' });

Staff.belongsTo(StaffPermissions, { foreignKey: 'permission_id', as: 'staff_permissions' });
StaffPermissions.hasMany(Staff, { foreignKey: 'permission_id' });
Staff.belongsTo(Office, { foreignKey: 'office_id' });

module.exports = {
    Category,
    Product,
    Client,
    Office,
    Order,
    OrderAddress,
    OrderItem,
    PriceType,
    ProductInventory,
    ProductPrice,
    Staff,
    StaffApplication,
    StaffPermissions,
};