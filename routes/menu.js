var express = require('express');
var router = express.Router();
var menuController = require('../controllers/menuController');
var utils = require('../utils');
const menuData = require('../models/menuData');
const Order = require('../models/order');
var itemOption = require('../models/menuItemOption');
var optionData = require('../models/menuOptionData');

// Used to verify user is signed in
function requireSession(req, res, next) {
    if (!req.employee) {
        req.session.returnTo = req.originalUrl;
        res.redirect('/');
        return;
    }
    next();
}

router.get('/:id', utils.asyncHandler(async function (req, res, next) {
    const menuItems = await menuData.getAllMenuItems();
    const order = new Order(req.params.id);
    if (await order.load()) {
        if (order.status == 'new') {
            order.status = 'incomplete';
            await order.save();
        }
        res.status(200).render('menu', { menuItems, order });
    } else {
        next(); // Let it 404
    }
}));

router.get('/management', requireSession, utils.asyncHandler(async function (req, res, next) {
    if (!req.employee.position.includes("manager")) {
        next();
        return;
    }
    const menuItems = await menuData.getAllMenuItems();
    res.status(200).render('menuManagement', { menuItems });
}));

module.exports = router;
