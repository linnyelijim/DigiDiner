var express = require('express');
var router = express.Router();
var utils = require('../utils');
const Waitstaff = require('./api/waitstaff');
const Management = require('./api/management');
const Employee = require('../models/employee')
const Table = require('../models/table');
const menuData = require('../models/menuData');

// Used to verify user is signed in
function requireSession(req, res, next) {
    if (!req.employee) {
        req.session.returnTo = req.originalUrl;
        res.redirect('/');
        return;
    }
    next();
}

router.get('/', requireSession, utils.asyncHandler(async function (req, res) {
    const menuItems = await menuData.getAllMenuItems();
    res.render('floormap', {
        employee: req.employee,
        Waitstaff,
        Management,
        Table,
        Employee,
        menuItems
    });
}));

module.exports = router;
