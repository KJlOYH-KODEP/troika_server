// src/controllers/OfficeController.js
const { Office } = require('../models');

class OfficeController {
    static async getAllOffices(req, res) {
        try {
            const offices = await Office.findAll();
            res.status(200).json(offices);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при получении списка офисов.' });
        }
    }

    static async getOfficeById(req, res) {
        const { id } = req.params;
        try {
            const office = await Office.findByPk(id);
            if (!office) {
                return res.status(404).json({ message: 'Офис не найден.' });
            }
            res.status(200).json(office);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при получении офиса.' });
        }
    }

    static async createOffice(req, res) {
        const { name, address_line, settlement, region, postal_code, country, phone_number } = req.body;
        try {
            const office = await Office.create({
                name,
                address_line,
                settlement,
                region,
                postal_code,
                country,
                phone_number
            });
            res.status(201).json(office);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при создании офиса.' });
        }
    }

    static async updateOffice(req, res) {
        const { id } = req.params;
        const { name, address_line, settlement, region, postal_code, country, phone_number } = req.body;
        try {
            const office = await Office.findByPk(id);
            if (!office) {
                return res.status(404).json({ message: 'Офис не найден.' });
            }
            office.name = name;
            office.address_line = address_line;
            office.settlement = settlement;
            office.region = region;
            office.postal_code = postal_code;
            office.country = country;
            office.phone_number = phone_number;
            await office.save();
            res.status(200).json(office);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при обновлении офиса.' });
        }
    }
}

module.exports = OfficeController;