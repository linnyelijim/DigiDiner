var express = require('express');
var router = express.Router();

var utils = require('../../utils');
var Table = require('../../models/table');
var Order = require('../../models/order');
var menuItemOption = require('../../models/menuItemOption');

// Used to verify user is signed in and a member of kitchen staff
function requireSession(req, res, next) {
    if (!req.employee) {
        res.status(401).json({
            'error': "Not Signed In"
        });
        return;
    }
    if (!req.employee.position.includes("kitchen") && !req.employee.position.includes("manager")) {
        res.status(403).json({
            'error': "Not Authorized"
        });
        return;
    }
    next();
}

/* GET submitted order list */
router.get('/order/list', requireSession, utils.asyncHandler(async function(req, res) {
    const orders = await Order.listOrders();
    res.status(200).json(await Promise.all(orders.filter(order => order.status == 'submitted').map(async order => ({
        'id': order.id,
        'tableId': order.tableId,
        'paymentId': order.paymentId,
        'status': order.status,
        'time': order.time,
        'items': await Promise.all((await order.getItems()).map(async item => ({
            'id': item.id,
            'itemId': item.itemId,
            'count': item.count,
            'options': Object.fromEntries((await menuItemOption.getOptionsForMenuItem(item.itemId)).map(itemOption => [itemOption.option.id, itemOption.choice])),
            'allergies': item.allergies,
            'request': item.request
        })))
    }))));
}));

/* POST order ready */
router.post('/order/ready', requireSession, utils.asyncHandler(async function(req, res) {
    if (req.body.orderId == null) {
        res.status(400).json({
            'error': "Missing Required Fields"
        });
        return;
    }
    const order = new Order(req.body.orderId);
    if (!(await order.load())) {
        res.status(400).json({
            'error': "Invalid or Expired Order"
        });
        return;
    }
    if (order.status != 'submitted') {
        res.status(400).json({
            'error': "Order Not Submitted or Already Readied"
        });
        return;
    }
    order.status = 'ready';
    await order.save();
    res.status(200).json({
        'id': order.id,
        'tableId': order.tableId,
        'paymentId': order.paymentId,
        'status': order.status,
        'time': order.time,
        'items': await Promise.all((await order.getItems()).map(async item => ({
            'id': item.id,
            'itemId': item.itemId,
            'count': item.count,
            'options': Object.fromEntries((await menuItemOption.getOptionsForMenuItem(item.itemId)).map(itemOption => [itemOption.option.id, itemOption.choice])),
            'allergies': item.allergies,
            'request': item.request
        })))
    });
}));

module.exports = router;
