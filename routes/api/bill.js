const express = require('express');
const router = express.Router();
const Payment = require('../../models/payment');


router.get('/', async (req, res) => {
    try {
        // Retrieve the order data from the server
        const orderResponse = await import('node-fetch').then(({ default: fetch }) => fetch('http://digidiner.net/order/data'));
        const orderData = await orderResponse.json();
        const order = orderData.order;

        res.render('bill', {
            order,
            calculateSubtotal: Payment.calculateSubtotal,
            calculateTaxes: Payment.calculateTaxes,
            calculateTotal: Payment.calculateTotal,
        });
    } catch (error) {
        console.error('Error retrieving order data:', error);
        // Handle the error and return an appropriate response
        res.sendStatus(500);
    }
});

module.exports = router;
