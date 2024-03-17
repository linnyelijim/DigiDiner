var express = require('express');
var router = express.Router();

var utils = require('../../utils');
var Table = require('../../models/table');
var Order = require('../../models/order');
var Payment = require('../../models/payment');
var PaymentMethodCreditcard = require('../../models/paymentMethodCreditcard');
var menuItemOption = require('../../models/menuItemOption');

// Used to require and identify an existing order with the param :order
const requireOrder = utils.asyncHandler(async function (req, res, next) {
    if (!req.query.orderId) {
        res.status(400).json({
            'error': "Invalid Request"
        });
        return;
    }
    req.order = new Order(req.query.orderId);
    if (!(await req.order.load())) {
        res.status(400).json({
            'error': "Invalid or Expired Order"
        });
        return;
    }
    next();
});

/* GET order info */
router.get('/order', requireOrder, utils.asyncHandler(async function (req, res) {
    res.status(200).json({
        'id': req.order.id,
        'tableId': req.order.tableId,
        'paymentId': req.order.paymentId,
        'status': req.order.status,
        'time': req.order.time,
        'paid': await req.order.isPaidFor(),
        'items': await Promise.all((await req.order.getItems()).map(async item => ({
            'id': item.id,
            'itemId': item.itemId,
            'count': item.count,
            'options': Object.fromEntries((await menuItemOption.getOptionsForMenuItem(item.itemId)).map(itemOption => [itemOption.option.id, itemOption.choice])),
            'allergies': item.allergies,
            'request': item.request
        })))
    });
}));

/* POST new order item */
router.post('/order/item', requireOrder, utils.asyncHandler(async function (req, res) {
    const { itemId, options, allergies, request, count } = req.body;

    if (itemId == null) {
        res.status(400).json({
            'error': "Missing Required Fields"
        });
        return;
    }
    if (req.order.status != 'incomplete') {
        res.status(400).json({
            'error': "Order Can No Longer Be Modified"
        });
        return;
    }
    let newItem;
    try {
        newItem = await req.order.addItem(itemId, count, allergies, request);
    } catch (err) {
        res.status(400).json({
            'error': "Invalid Item ID"
        });
        return;
    }
    let newItemOptions = [];
    if (options != null) {
        for (const optionKey in options) {
            const option = await newItem.getItemOption(optionKey);
            if (option != null) {
                option.choice = options[optionKey];
                newItemOptions.push(option);
            }
        }
    }
    await Promise.all(newItemOptions.map(option => option.save()));
    res.status(newItem.count == count ?? 1 ? 201 : 200).json({
        'id': newItem.id,
        'itemId': newItem.itemId,
        'count': newItem.count,
        'options': Object.fromEntries((await menuItemOption.getOptionsForMenuItem(newItem.itemId)).map(itemOption => [itemOption.option.id, itemOption.choice])),
        'allergies': newItem.allergies,
        'request': newItem.request
    });
}));

/* DELETE order item */
router.delete('/order/item', requireOrder, utils.asyncHandler(async function (req, res) {
    if (req.body.itemId == null) {
        res.status(400).json({
            'error': "Missing Required Fields"
        });
        return;
    }
    if (req.order.status != 'incomplete') {
        res.status(400).json({
            'error': "Order Can No Longer Be Modified"
        });
        return;
    }
    if (await req.order.removeItem(req.body.itemId)) {
        res.status(204).json({});
    } else {
        res.status(404).json({
            'error': "Order Item Does Not eXist"
        });
    }
}));

/* POST order submit */
router.post('/order/submit', requireOrder, utils.asyncHandler(async function (req, res) {
    if (req.order.status != 'incomplete') {
        res.status(400).json({
            'error': "Order Already Submitted"
        });
        return;
    }
    req.order.status = 'submitted';
    await req.order.save();
    res.status(200).json({
        'id': req.order.id,
        'tableId': req.order.tableId,
        'paymentId': req.order.paymentId,
        'status': req.order.status,
        'time': req.order.time,
        'paid': await req.order.isPaidFor(),
        'items': await Promise.all((await req.order.getItems()).map(async item => ({
            'id': item.id,
            'itemId': item.itemId,
            'count': item.count,
            'options': Object.fromEntries((await menuItemOption.getOptionsForMenuItem(item.itemId)).map(itemOption => [itemOption.option.id, itemOption.choice])),
            'allergies': item.allergies,
            'request': item.request
        })))
    });
}));

/* POST order payment via credit card */
router.post('/order/pay/creditcard', requireOrder, utils.asyncHandler(async function (req, res) {
    if (req.order.paymentId != null) {
        res.status(400).json({
            'error': "Order Already Paid For"
        });
        return;
    }
    const payment = await Payment.registerPayment(await req.order.calculateSubtotal(), await req.order.calculateTaxes(), req.body.tip ?? 0, 'creditcard', Date.now());
    await PaymentMethodCreditcard.insertPaymentMethod(payment.id, req.body.fullName, req.body.cardNumber, req.body.cvv, req.body.expiration, req.body.zipCode);
    req.order.paymentId = payment.id;
    await req.order.save();
    res.status(200).json({
        'id': req.order.id,
        'tableId': req.order.tableId,
        'paymentId': req.order.paymentId,
        'status': req.order.status,
        'time': req.order.time,
        'paid': await req.order.isPaidFor(),
        'items': await Promise.all((await req.order.getItems()).map(async item => ({
            'id': item.id,
            'itemId': item.itemId,
            'count': item.count,
            'options': Object.fromEntries((await menuItemOption.getOptionsForMenuItem(item.itemId)).map(itemOption => [itemOption.option.id, itemOption.choice])),
            'allergies': item.allergies,
            'request': item.request
        })))
    });
}));

/* POST order payment via cash */
router.post('/order/pay/cash', requireOrder, utils.asyncHandler(async function (req, res) {
    if (req.order.paymentId != null) {
        res.status(400).json({
            'error': "Order Already Paid For"
        });
        return;
    }
    const payment = await Payment.registerPayment(await req.order.calculateSubtotal(), await req.order.calculateTaxes(), req.body.tip ?? 0, 'cash', Date.now());
    req.order.paymentId = payment.id;
    await req.order.save();
    res.status(200).json({
        'id': req.order.id,
        'tableId': req.order.tableId,
        'paymentId': req.order.paymentId,
        'status': req.order.status,
        'time': req.order.time,
        'paid': await req.order.isPaidFor(),
        'items': await Promise.all((await req.order.getItems()).map(async item => ({
            'id': item.id,
            'itemId': item.itemId,
            'count': item.count,
            'options': Object.fromEntries((await menuItemOption.getOptionsForMenuItem(item.itemId)).map(itemOption => [itemOption.option.id, itemOption.choice])),
            'allergies': item.allergies,
            'request': item.request
        })))
    });
}));

/* DELETE order */
router.delete('/order', requireOrder, utils.asyncHandler(async function (req, res) {
    if (await req.order.delete()) {
        const table = new Table(req.order.tableId);
        await table.load();
        table.status = 'dirty';
        await table.save();
        res.status(204).json({});
    } else {
        res.status(404).json({
            'error': "Order Does Not exist"
        });
    }
}));

module.exports = router;
