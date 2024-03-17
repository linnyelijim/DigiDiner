var express = require('express');
var router = express.Router();

var utils = require('../utils');

const menuData = require('../models/menuData');
const Order = require('../models/order');

router.get('/:id', utils.asyncHandler(async function (req, res, next) {
    const order = new Order(req.params.id);
    if (await order.load()) {
        if (order.status == 'new') {
            order.status = 'incomplete';
            await order.save();
        }
        let orderItems = await order.getItems();
        let menuItems = Object.fromEntries((await menuData.getAllMenuItems()).map(item => [item.id, item]));
        res.status(200).render('bill', { subtotal: calculateSubtotal(orderItems, menuItems), taxes: calculateTaxes(orderItems, menuItems), total: calculateTotal(orderItems, menuItems, 0), order: order, orderItems: orderItems, menuItems: menuItems }); // Pass the orderData to the order.ejs template
    } else {
        next(); // Let it 404
    }
}));

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
