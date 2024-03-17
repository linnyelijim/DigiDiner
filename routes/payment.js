const express = require('express');
const router = express.Router();
const PaymentMethodCreditcard = require('../models/paymentMethodCreditcard');
const Order = require('../models/order');
const MenuData = require('../models/menuData');
const utils = require("../utils");
const fs = require('fs');
const path = require("path");

router.get('/:id', utils.asyncHandler(async function (req, res, next) {
    const orderId = req.params.id;
    const order = new Order(orderId);

    if (await order.load()) {
        if (order.status === 'new') {
            order.status = 'incomplete';
            await order.save();
        }
        let orderItems = await order.getItems();
        let menuItems = Object.fromEntries((await MenuData.getAllMenuItems()).map(item => [item.id, item]));
        let subtotal = calculateSubtotal(orderItems, menuItems);
        let taxes = calculateTaxes(orderItems, menuItems);
        let total = calculateTotal(orderItems, menuItems, 0);

        res.status(200).render('payment', {
            orderId: orderId,
            orderItems: orderItems,
            menuItems: menuItems,
            subtotal: subtotal,
            taxes: taxes,
            total: total
        });
    } else {
        next(); // Let it 404
    }

}));

// Provide the list of states for the credit card payment
router.get('/states', (req, res) => {
    const filePath = path.join(__dirname, '../config/states.json')

    // Read the "states.json" file
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading states.json:', err);
            return res.status(500).send('Internal Server Error');
        }

        const states = JSON.parse(data);
        res.json(states);
    });
});

function calculateSubtotal(orderItems, menuItems) {
    var subtotal = 0;
    orderItems.forEach(function (item) {
        subtotal += item.count * menuItems[item.itemId].price;
    });
    return subtotal;
}

function calculateTaxes(orderItems, menuItems) {
    var subtotal = calculateSubtotal(orderItems, menuItems);
    var taxes = subtotal * 0.1; // Assuming tax rate of 10%
    return taxes;
}

function calculateTotal(orderItems, menuItems, tip) {
    var subtotal = calculateSubtotal(orderItems, menuItems);
    var taxes = calculateTaxes(orderItems, menuItems);
    var total = parseFloat(subtotal) + parseFloat(taxes) + parseFloat(tip);
    return total;
}

module.exports = router;