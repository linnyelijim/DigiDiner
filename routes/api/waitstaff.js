var express = require('express');
var router = express.Router();

var utils = require('../../utils');
var Table = require('../../models/table');
var Order = require('../../models/order');
var Payment = require('../../models/payment');
var PaymentMethodCash = require('../../models/paymentMethodCash');
var menuItemOption = require('../../models/menuItemOption');

// Used to verify user is signed in and a waitstaff
function requireSession(req, res, next) {
    if (!req.employee) {
        res.status(401).json({
            'error': "Not Signed In"
        });
        return;
    }
    if (!req.employee.position.includes("waitstaff") && !req.employee.position.includes("manager")) {
        res.status(403).json({
            'error': "Not Authorized"
        });
        return;
    }
    next();
}

/* POST new order */
router.post('/order', requireSession, utils.asyncHandler(async function (req, res) {
    if (req.body.tableId == null) {
        res.status(400).json({
            'error': "Missing Required Fields"
        });
        return;
    }
    if (await Order.getOrderForTable(req.body.tableId)) {
        res.status(400).json({
            'error': "Table Already Has Associated Order"
        });
        return;
    }
    const newOrder = new Order(Math.floor(Math.random() * 18446744073709551615), req.body.tableId);
    await newOrder.save();
    const table = new Table(req.body.tableId);
    await table.load();
    table.status = 'occupied';
    await table.save();
    res.status(201).json({
        'id': newOrder.id,
        'tableId': newOrder.tableId,
        'paymentId': newOrder.paymentId,
        'status': newOrder.status,
        'time': newOrder.time,
        'paid': false,
        'items': await Promise.all((await newOrder.getItems()).map(async item => ({
            'id': item.id,
            'itemId': item.itemId,
            'count': item.count,
            'options': Object.fromEntries((await menuItemOption.getOptionsForMenuItem(item.itemId)).map(itemOption => [itemOption.option.id, itemOption.choice]))
        })))
    });
}));

/* GET order by id or table */
router.get('/order', requireSession, utils.asyncHandler(async function (req, res) {
    if ((req.query.orderId == null) == (req.query.tableId == null)) {
        res.status(400).json({
            'error': "Unnaceptable Query"
        });
        return;
    }
    const order = req.query.orderId != null ? await Order.getOrderById(req.query.orderId) : await Order.getOrderForTable(req.query.tableId);
    if (order == null) {
        res.status(404).json({
            'error': "Order Does Not Exist",
            'status': "No order"
        });
        return;
    }
    res.status(200).json({
        'id': order.id,
        'tableId': order.tableId,
        'paymentId': order.paymentId,
        'status': order.status,
        'time': order.time,
        'paid': await order.isPaidFor(),
        'items': await Promise.all((await order.getItems()).map(async item => ({
            'id': item.id,
            'itemId': item.itemId,
            'count': item.count,
            'options': Object.fromEntries((await menuItemOption.getOptionsForMenuItem(item.itemId)).map(itemOption => [itemOption.option.id, itemOption.choice]))
        })))
    });
}));

/* GET order list */
router.get('/order/list', requireSession, utils.asyncHandler(async function (req, res) {
    const orders = await Order.listOrders();
    orders.sort((a, b) => a.time - b.time);
    res.status(200).json(await Promise.all(orders.map(async order => ({
        'id': order.id,
        'tableId': order.tableId,
        'paymentId': order.paymentId,
        'status': order.status,
        'time': order.time,
        'paid': await order.isPaidFor(),
        'items': await Promise.all((await order.getItems()).map(async item => ({
            'id': item.id,
            'itemId': item.itemId,
            'count': item.count,
            'options': Object.fromEntries((await menuItemOption.getOptionsForMenuItem(item.itemId)).map(itemOption => [itemOption.option.id, itemOption.choice]))
        })))
    }))));
}));

/* PUT order status */
router.put('/order/status', requireSession, utils.asyncHandler(async function (req, res) {
    if (req.body.orderId == null || req.body.status == null) {
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
    order.status = req.body.status;
    await order.save();
    res.status(200).json({
        'id': order.id,
        'tableId': order.tableId,
        'paymentId': order.paymentId,
        'status': order.status,
        'time': order.time,
        'paid': await order.isPaidFor(),
        'items': await Promise.all((await order.getItems()).map(async item => ({
            'id': item.id,
            'itemId': item.itemId,
            'count': item.count,
            'options': Object.fromEntries((await menuItemOption.getOptionsForMenuItem(item.itemId)).map(itemOption => [itemOption.option.id, itemOption.choice]))
        })))
    });
}));

/* PUT order cash payment */
router.put('/order/cash', requireSession, utils.asyncHandler(async function (req, res) {
    if (req.body.orderId == null || req.body.amount == null) {
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
    if (order.paymentId == null) {
        order.paymentId = (await Payment.registerPayment(await order.calculateSubtotal(), await order.calculateTaxes(), req.body.tip ?? 0, 'cash', Date.now())).id;
        await order.save();
    }
    await PaymentMethodCash.insertPaymentMethod(order.paymentId, req.body.amount);
    res.status(200).json({
        'id': order.id,
        'tableId': order.tableId,
        'paymentId': order.paymentId,
        'status': order.status,
        'time': order.time,
        'paid': await order.isPaidFor(),
        'items': await Promise.all((await order.getItems()).map(async item => ({
            'id': item.id,
            'itemId': item.itemId,
            'count': item.count,
            'options': Object.fromEntries((await menuItemOption.getOptionsForMenuItem(item.itemId)).map(itemOption => [itemOption.option.id, itemOption.choice]))
        })))
    });
}));

/* DELETE order */
router.delete('/order', requireSession, utils.asyncHandler(async function (req, res) {
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
    if (await order.delete()) {
        res.status(204).json({});
    } else {
        res.status(404).json({
            'error': "Order Does Not exist"
        });
    }
}));

/* GET table */
router.get('/table', requireSession, utils.asyncHandler(async function (req, res) {
    if (req.body.id == null) {
        res.status(400).json({
            'error': "Missing Required Fields"
        });
        return;
    }
    const table = await Table.getTable(req.body.id);
    const order = await Order.getOrderForTable(table.id);
    res.status(200).json({
        'id': table.id,
        'seats': table.seats,
        'posX': table.posX,
        'posY': table.posY,
        'status': table.status,
        'orderId': order?.id,
        'orderStatus': order?.status,
        'orderPaid': order != null ? await order.isPaidFor() ? 'Yes' : order.paymentId == null ? 'No' : 'Cash Waiting' : null
    });
}));

/* PUT table status */
router.put('/table/status', requireSession, utils.asyncHandler(async function (req, res) {
    if (req.body.id == null) {
        res.status(400).json({
            'error': "Missing Required Fields"
        });
        return;
    }
    let table = await Table.getTable(req.body.id);
    if (req.body.status) table.status = req.body.status;
    await table.save();
    const order = await Order.getOrderForTable(table.id);
    res.status(200).json({
        'id': table.id,
        'seats': table.seats,
        'posX': table.posX,
        'posY': table.posY,
        'status': table.status,
        'orderId': order?.id,
        'orderStatus': order?.status,
        'orderPaid': order != null ? await order.isPaidFor() ? 'Yes' : order.paymentId == null ? 'No' : 'Cash Waiting' : null
    });
}));

/* GET table list */
router.get('/table/list', requireSession, utils.asyncHandler(async function (req, res) {
    const orders = Object.fromEntries((await Order.listOrders()).map(order => [order.tableId, order]));
    res.status(200).json(await Promise.all((await Table.listTables()).map(async table => ({
        'id': table.id,
        'seats': table.seats,
        'posX': table.posX,
        'posY': table.posY,
        'status': table.status,
        'orderId': orders[table.id]?.id,
        'orderStatus': orders[table.id]?.status,
        'orderPaid': await orders[table.id] != null ? await orders[table.id].isPaidFor() ? 'Yes' : orders[table.id].paymentId == null ? 'No' : 'Cash Waiting' : null
    }))));
}));

/* DELETE table by ID */
router.delete('/table/:id', requireSession, utils.asyncHandler(async function (req, res) {
    const tableId = parseInt(req.params.id);
    const tableDeleted = await Table.removeTable(tableId);

    if (tableDeleted) {
        res.status(200).json({ 'message': 'Table deleted successfully' });
    } else {
        res.status(404).json({ 'error': 'Table not found' });
    }
}));

module.exports = router;
