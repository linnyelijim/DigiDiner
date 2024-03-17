const nodemailer = require('nodemailer');
const twilio = require('twilio');

class PaymentMethodCash {
    id;
    paymentId;
    amount;

    constructor(id, paymentId, amount) {
        this.id = id;
        this.paymentId = paymentId;
        this.amount = amount;
    }

    static connectDatabase(conn) {
        this.conn = conn;
        conn.query(`CREATE TABLE IF NOT EXISTS payment_method_cash (
            id INT PRIMARY KEY AUTO_INCREMENT,
            payment_id INT UNIQUE DEFAULT NULL,
            amount DECIMAL(20,2) NOT NULL,
            CONSTRAINT payment_method_cash_fk_payment_id
                FOREIGN KEY (payment_id) REFERENCES payment (id)
                ON DELETE CASCADE
                ON UPDATE CASCADE
        )`);
    }

    static async getCashPayment(paymentId) {
        const record = (await PaymentMethodCash.conn.query(`SELECT * FROM payment_method_cash WHERE payment_id = '${paymentId}'`))[0];
        if (record && paymentId == record.payment_id) {
            return new PaymentMethodCash(
                record.id,
                record.payment_id,
                record.amount
            );
        }
        return null;
    }

    static async insertPaymentMethod(paymentId, amount) {
        const properties = [
            amount
        ]
        const id = (await PaymentMethodCash.conn.query(`INSERT INTO payment_method_cash (payment_id, amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE amount=?`, [paymentId, ...properties, ...properties])).insertId;
        return new PaymentMethodCash(id, paymentId, amount);
    }

    async load() {
        const record = (await PaymentMethodCash.conn.query(`SELECT * FROM payment_method_cash WHERE id = '${this.id}'`))[0];
        if (record && this.id == record.id) {
            this.paymentId = record.payment_id;
            this.amount = record.amount;
            return true;
        }
        return false;
    }

    async save() {
        const properties = [
            this.paymentId,
            this.amount,
        ]
        await PaymentMethodCash.conn.query(`INSERT INTO payment_method_cash (id, payment_id, amount) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE payment_id=?, amount=?`, [this.id, ...properties, ...properties]);
    }
}

module.exports = PaymentMethodCash;
