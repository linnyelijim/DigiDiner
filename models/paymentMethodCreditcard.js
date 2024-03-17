const nodemailer = require('nodemailer');
const twilio = require('twilio');

class PaymentMethodCreditcard {
    static connectDatabase(conn) {
        this.conn = conn;
        conn.query(`CREATE TABLE IF NOT EXISTS payment_method_creditcard (
            id INT PRIMARY KEY AUTO_INCREMENT,
            payment_id INT UNIQUE DEFAULT NULL,
            full_name VARCHAR(100) NOT NULL,
            card_number VARCHAR(16) NOT NULL,
            cvv VARCHAR(3) NOT NULL,
            expiration VARCHAR(7) NOT NULL,
            zip_code VARCHAR(10) NOT NULL,
            CONSTRAINT payment_method_creditcard_fk_payment_id
                FOREIGN KEY (payment_id) REFERENCES payment (id)
                ON DELETE CASCADE
                ON UPDATE CASCADE
        )`);
    }

    static async insertPaymentMethod(paymentId, fullName, cardNumber, cvv, expiration, zipCode) {
        const query = 'INSERT INTO payment_method_creditcard (payment_id, full_name, card_number, cvv, expiration, zip_code) VALUES (?, ?, ?, ?, ?, ?)';
        const values = [paymentId, fullName, cardNumber, cvv, expiration, zipCode];
        return await this.conn.query(query, values);
    }
}

module.exports = PaymentMethodCreditcard;
