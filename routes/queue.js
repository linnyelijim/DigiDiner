var express = require('express');
var router = express.Router();
var Order = require('../models/order');
const menuData = require('../models/menuData');
const menuOptionData = require('../models/menuOptionData');

// Used to verify user is signed in
function requireSession(req, res, next) {
    if (!req.employee) {
        req.session.returnTo = req.originalUrl;
        res.redirect('/');
        return;
    }
    next();
}

/* GET queue page */
router.get('/', requireSession, async function (req, res) {
    try {
        const orders = await Order.listOrders();
        orders.sort((a, b) => a.time - b.time);
        const submittedOrders = orders.filter(order => order.status === 'submitted');
        for (const order of submittedOrders) {
            order.items = await order.getItems();
            for (const item of order.items) {
                item.options = await item.getItemOptions();
            }
        }
        res.status(200).render('queue', {
            orderQueue: submittedOrders,
            menuItems: Object.fromEntries((await menuData.getAllMenuItems()).map(item => [item.id, item])),
            menuOptions: Object.fromEntries((await menuOptionData.getAllMenuOption()).map(option => [option.id, option]))
        });
    } catch (error) {
        console.error('Error occurred while fetching orders:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
