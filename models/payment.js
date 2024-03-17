class Payment {
    id;
    subtotal;
    tax;
    tip;
    method;
    date;

    constructor(id, subtotal, tax, tip, method, date) {
        this.id = id;
        this.subtotal = subtotal;
        this.tax = tax;
        this.tip = tip ?? 0.0;
        this.method = method;
        this.date = date ?? Date.now();
    }

    static connectDatabase(conn) {
        this.conn = conn;
        conn.query(`CREATE TABLE IF NOT EXISTS payment (
            id INT PRIMARY KEY AUTO_INCREMENT,
            subtotal DECIMAL(20,2) NOT NULL,
            tax DECIMAL(20,2) NOT NULL,
            tip DECIMAL(20,2) NOT NULL,
            method VARCHAR(20) NOT NULL,
            date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
    }

    static async getPaymentById(id) {
        const record = (await Payment.conn.query(`SELECT * FROM payment WHERE id = '${id}'`))[0];
        if (record && id == record.id) {
            return new Payment(
                record.id,
                record.subtotal,
                record.tax,
                record.tip,
                record.method,
                new Date(record.date).getTime()
            );
        }
        return null;
    }

    static async registerPayment(subtotal, tax, tip, method, date) {
        const properties = [
            subtotal,
            tax,
            tip,
            method,
            new Date(date).toISOString().slice(0, 19).replace('T', ' ') // Converts JavaScript date to string acceptable by SQL
        ]
        const id = (await Payment.conn.query(`INSERT INTO payment (subtotal, tax, tip, method, date) VALUES (?, ?, ?, ?, ?)`, properties)).insertId;
        return new Payment(id, subtotal, tax, tip, method, date);
    }

    async load() {
        const record = (await Payment.conn.query(`SELECT * FROM payment WHERE id = '${this.id}'`))[0];
        if (record && this.id == record.id) {
            this.subtotal = parseFloat(record.subtotal);
            this.tax = parseFloat(record.tax);
            this.tip = parseFloat(record.tip);
            this.method = record.method;
            this.date = new Date(record.date).getTime(); // Converts SQL timestamp milliseconds representation of date
            return true;
        }
        return false;
    }

    async save() {
        const properties = [
            this.subtotal,
            this.tax,
            this.tip,
            this.method,
            new Date(this.date).toISOString().slice(0, 19).replace('T', ' ') // Converts JavaScript date to string acceptable by SQL
        ]
        await Payment.conn.query(`INSERT INTO payment (id, subtotal, tax, tip, method, date) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE subtotal=?, tax=?, tip=?, method=?, date=?`, [this.id, ...properties, ...properties]);
    }

    sendEmailReceipt(email) {
        const transporter = nodemailer.createTransport({
            service: 'YourEmailService',
            auth: {
                user: 'YourEmail',
                pass: 'YourEmailPassword'
            }
        });

        const mailOptions = {
            from: 'YourEmailAddress',
            to: email,
            subject: 'Receipt',
            text: 'Here is your receipt.'
            // You can add more details to the email content or attach a PDF receipt if desired
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });
    }

    sendTextReceipt(phoneNumber) {
        const twilioClient = twilio('YourTwilioAccountSid', 'YourTwilioAuthToken');
        const message = 'Here is your receipt.';

        twilioClient.messages
            .create({
                body: message,
                from: 'YourTwilioPhoneNumber',
                to: phoneNumber
            })
            .then(message => console.log('Text message sent:', message.sid))
            .catch(error => console.error('Error sending text message:', error));
    }
}

module.exports = Payment;