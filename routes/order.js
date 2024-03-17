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
        res.status(200).render('order', { order: order, orderItems: await order.getItems(), menuItems: Object.fromEntries((await menuData.getAllMenuItems()).map(item => [item.id, item])) }); // Pass the orderData to the order.ejs template
    } else {
        next(); // Let it 404
    }
}));

module.exports = router;
