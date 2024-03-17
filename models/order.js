var Table = require('./table');
var Payment = require('./payment');
var menuData = require('./menuData');
var menuOptionData = require('./menuOptionData');
var paymentMethodCash = require('./paymentMethodCash');

const orderExpiryTime = 12 * 60 * 60 * 1000;

class Order {
    id;
    tableId;
    paymentId;
    status;
    time;

    constructor(id, tableId, paymentId, status, time) {
        this.id = id;
        this.tableId = tableId ?? null;
        this.paymentId = paymentId ?? null;
        if (time == null || Date.now() - time < orderExpiryTime) {
            this.status = status ?? 'new';
            this.time = time ?? Date.now();
        } else {
            this.status = 'expired';
            this.time = time;
            this.delete();
        }
    }

    static connectDatabase(conn) {
        this.conn = conn;
        conn.query(`
            CREATE TABLE IF NOT EXISTS \`order\` (
                id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
                table_id INT UNIQUE NOT NULL,
                payment_id INT UNIQUE DEFAULT NULL,
                status VARCHAR(10) NOT NULL DEFAULT 'incomplete',
                time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT order_fk_table_id
                    FOREIGN KEY (table_id) REFERENCES \`table\` (id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,
                CONSTRAINT order_fk_payment_id
                    FOREIGN KEY (payment_id) REFERENCES payment (id)
                    ON DELETE SET NULL
                    ON UPDATE CASCADE
            )
        `);

        conn.query(`
            CREATE TABLE IF NOT EXISTS order_item (
                id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
                order_id BIGINT UNSIGNED NOT NULL,
                item_id INT NOT NULL,
                count INT NOT NULL DEFAULT 1,
                allergies VARCHAR(50) DEFAULT NULL,
                request VARCHAR(250) DEFAULT NULL,
                CONSTRAINT order_item_fk_order_id
                    FOREIGN KEY (order_id) REFERENCES \`order\` (id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,
                CONSTRAINT order_item_fk_item_id
                    FOREIGN KEY (item_id) REFERENCES menu (id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
            )
        `);
        
        conn.query(`
            CREATE TABLE IF NOT EXISTS order_item_option (
                order_item_id BIGINT UNSIGNED NOT NULL,
                option_id INT NOT NULL,
                choice VARCHAR(50) DEFAULT NULL,
                CONSTRAINT order_item_option_pk
                    PRIMARY KEY (order_item_id, option_id),
                CONSTRAINT order_item_option_fk_order_item_id
                    FOREIGN KEY (order_item_id) REFERENCES order_item (id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,
                CONSTRAINT order_item_option_fk_option_id
                    FOREIGN KEY (option_id) REFERENCES menu_option (id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
            )
        `);
    }

    static async listOrders() {
        return (await Order.conn.query(`SELECT * FROM \`order\``)).map(record => new Order(record.id, record.table_id, record.payment_id, record.status, record.time));
    }

    static async getOrderById(orderId) {
        const order = new Order(orderId);
        if (await order.load()) {
            return order;
        }
        return null;
    }

    static async getOrderForTable(tableId) {
        const record = (await Order.conn.query(`SELECT * FROM \`order\` WHERE table_id = '${tableId}'`))[0];
        if (record && tableId == record.table_id) {
            const order = new Order(record.id, record.table_id, record.payment_id, record.status, new Date(record.time).getTime());;
            return order.status != 'expired' ? order : null;
        }
        return null;
    }

    async getTable() {
        return await Table.getTable(this.tableId);
    }

    async getPayment() {
        return this.paymentId != null ? await Payment.getPaymentById(this.paymentId) : null;
    }

    async getItems() {
        return (await Order.conn.query(`SELECT * FROM order_item WHERE order_id = '${this.id}'`)).map(record => new OrderItem(record.id, this, record.item_id, record.count, record.allergies, record.request));
    }

    async getItem(id) {
        const item = new OrderItem(id, this);
        if (await item.load()) return item;
        return null;
    }

    async getItemByItemId(itemId) {
        const record = (await Order.conn.query(`SELECT * FROM order_item WHERE order_id = '${this.id}' AND item_id = '${itemId}'`))[0];
        if (record) {
            const item = new OrderItem(record.id, this);
            item.itemId = record.item_id;
            item.count = record.count;
            item.allergies = record.allergies;
            item.request = record.request;
            return item;
        }
        return null;
    }

    async addItem(itemId, count, allergies, request) {
        const existingItem = await this.getItemByItemId(itemId);
        if (existingItem != null) {
            existingItem.count += count ?? 1;
            if (allergies) {
                existingItem.allergies = existingItem.allergies ? existingItem.allergies + "," + allergies : allergies;
            }
            if (request) {
                existingItem.request = existingItem.request ? existingItem.request + "\n" + request : request;
            }
            await existingItem.save();
            return existingItem;
        }
        const result = await Order.conn.query(`INSERT INTO order_item (order_id, item_id, count, allergies, request) VALUES (?, ?, ?, ?, ?)`, [this.id, itemId, count ?? 1, allergies, request]);
        const newItem = new OrderItem(result.insertId, this, itemId, count, allergies, request);
        await Promise.all((await Order.conn.query(`SELECT * FROM menu_item_option WHERE menu_item_id = '${itemId}'`)).map(async (record) => {
            await Order.conn.query(`INSERT INTO order_item_option (order_item_id, option_id) VALUES (?, ?)`, [newItem.id, record.option_id]);
        }));
        return newItem;
    }

    async removeItem(id) {
        return (await Order.conn.query(`DELETE FROM order_item WHERE id = '${id}'`)).affectedRows > 0;
    }

    async updateStatus(status) {
        this.status = status;
        await this.save();
    }

    async isPaidFor() {
        const payment = await this.getPayment();
        if (payment == null) return false;
        return payment.method != 'cash' || await paymentMethodCash.getCashPayment(payment.id) != null;
    }

    async load() {
        const record = (await Order.conn.query(`SELECT * FROM \`order\` WHERE id = '${this.id}'`))[0];
        if (record && this.id == record.id) {
            this.tableId = record.table_id;
            this.paymentId = record.payment_id;
            this.status = record.status;
            this.time = new Date(record.time).getTime(); // Converts SQL timestamp milliseconds representation of date
            if (Date.now() - this.time < orderExpiryTime) {
                return true;
            } else {
                this.status = 'expired';
                await this.delete();
                return false;
            }
        }
        return false;
    }

    async save() {
        const properties = [
            this.tableId,
            this.paymentId,
            this.status,
            new Date(this.time).toISOString().slice(0, 19).replace('T', ' '), // Converts JavaScript date to string acceptable by SQL
        ]
        await Order.conn.query(`INSERT INTO \`order\` (id, table_id, payment_id, status, time) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE table_id=?, payment_id=?, status=?, time=?`, [this.id, ...properties, ...properties]);
    }

    async delete() {
        const table = new Table(this.tableId);
        if ((await table.load()) && table.status == 'occupied') {
            table.status = 'dirty';
            await table.save();
        }
        return (await Order.conn.query(`DELETE FROM \`order\` WHERE id = '${this.id}'`)).affectedRows > 0;
    }

    async calculateSubtotal() {
        var subtotal = 0;
        await Promise.all((await this.getItems()).map(async function (item) {
            subtotal += item.count * (await menuData.getMenuItem(item.itemId)).price;
        }));
        return subtotal;
    }
    
    async calculateTaxes() {
        return (await this.calculateSubtotal()) * 0.1; // Assuming tax rate of 10%
    }
    
    async calculateTotal(tip) {
        return (await this.calculateSubtotal()) + (await this.calculateTaxes()) + tip;
    }
}

class OrderItem {
    id;
    order;
    itemId;
    count;
    allergies;
    request;

    constructor(id, order, itemId, count, allergies, request) {
        this.id = id;
        this.order = order;
        this.itemId = itemId;
        this.count = count ?? 1;
        this.allergies = allergies ?? null;
        this.request = request ?? null;
    }

    async getItemOption(option) {
        const itemOption = new OrderItemOption(this, option);
        if (await itemOption.load()) return itemOption;
        return null;
    }

    async getItemOptions() {
        return await Promise.all((await Order.conn.query(`SELECT * FROM order_item_option WHERE order_item_id = '${this.id}'`)).map(async record => new OrderItemOption(this, await menuOptionData.getMenuOption(record.option_id), record.choice)));
    }

    async load() {
        const record = (await Order.conn.query(`SELECT * FROM order_item WHERE id = '${this.id}'`))[0];
        if (record && this.id == record.id) {
            this.itemId = record.item_id;
            this.count = record.count;
            this.allergies = record.allergies;
            this.request = record.request;
            return true;
        }
        return false;
    }

    async save() {
        const properties = [
            this.order.id,
            this.itemId,
            this.count,
            this.allergies,
            this.request
        ]
        await Order.conn.query(`INSERT INTO order_item (id, order_id, item_id, count, allergies, request) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE order_id=?, item_id=?, count=?, allergies=?, request=?`, [this.id, ...properties, ...properties]);
    }
}

class OrderItemOption {
    orderItem;
    option;
    choice;

    constructor(orderItem, option, choice) {
        this.orderItem = orderItem;
        this.option = option;
        this.choice = choice ?? null;
    }

    async load() {
        const record = (await Order.conn.query(`SELECT * FROM order_item_option WHERE order_item_id = '${this.orderItem.id}' AND option_id = '${this.option.id}'`))[0];
        if (record) {
            this.choice = record.choice;
            return true;
        }
        return false;
    }

    async save() {
        const properties = [
            this.choice,
        ]
        await Order.conn.query(`INSERT INTO order_item_option (order_item_id, option_id, choice) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE choice=?`, [this.orderItem.id, this.option.id, ...properties, ...properties]);
    }
}

module.exports = Order;