const express = require('express');
const router = express.Router();
const PaymentMethodCreditcard = require('../../models/paymentMethodCreditcard');
var utils = require('../../utils');

router.get('/', utils.asyncHandler(async function (req, res) {
    const total = req.query.total; // Retrieve the total cost from the query parameter
    res.render('receipt', { total });
}));

router.post('/', utils.asyncHandler(async function (req, res) {
    const { fullName, cardNumber, cvv, expiration, zipCode } = req.body;

    try {
        const orderResponse = await import('node-fetch').then(({ default: fetch }) => fetch('http://digidiner.net/order/data'));
        const orderData = await orderResponse.json();
        const order = orderData.order;

        const tip = req.body.tip; // Retrieve the tip amount from the request body

        res.render('bill', {
            order,
            subtotal: calculateSubtotal(order),
            taxes: calculateTaxes(order),
            total: calculateTotal(order, tip),
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        // Handle the error and return an appropriate response
        res.sendStatus(500);
    }
}));

function calculateSubtotal(order) {
    let subtotal = 0;
    order.forEach((item) => {
        subtotal += item.quantity * item.price;
    });
    return subtotal.toFixed(2);
}

function calculateTaxes(order) {
    const subtotal = this.calculateSubtotal(order);
    const taxes = subtotal * 0.1; // Assuming tax rate of 10%
    return taxes.toFixed(2);
}

function calculateTotal(order, tip) {
    const subtotal = this.calculateSubtotal(order);
    const taxes = this.calculateTaxes(order);
    const total = parseFloat(subtotal) + parseFloat(taxes) + parseFloat(tip);
    return total.toFixed(2);
}

const timestamp = '2023-07-05';
const fullName = 'John Doe';
const maskedCardNumber = '**** **** **** 1234';
const cvv = '123';
const expiration = '12/25';
const zipCode = '12345';

module.exports = router;