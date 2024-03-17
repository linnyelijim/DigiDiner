var bcrypt = require('bcrypt');

var TimeClock = require('./timeclock');

class Employee {
    static passSaltRounds = 10;

    id;
    passHash;
    nameFirst;
    nameLast;
    hireDate;
    position;

    timeClock;

    constructor(id, passHash, nameFirst, nameLast, hireDate, position) {
        this.id = id;
        this.passHash = passHash ?? null;
        this.nameFirst = nameFirst ?? null;
        this.nameLast = nameLast ?? null;
        this.hireDate = hireDate ?? Date.now();
        this.position = position ?? "none";

        this.timeClock = new TimeClock(id);
    }

    static connectDatabase(conn) {
        this.conn = conn;
        conn.query(`CREATE TABLE IF NOT EXISTS employee (
            id INT PRIMARY KEY,
            pass_hash BINARY(60) DEFAULT NULL,
            name_first VARCHAR(50) DEFAULT NULL,
            name_last VARCHAR(50) DEFAULT NULL,
            hire_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            position VARCHAR(50) NOT NULL DEFAULT 'none'
        )`);
    }

    static async listEmployees() {
        return (await Employee.conn.query(`SELECT * FROM employee`)).map(record => new Employee(record.id, record.pass_hash, record.name_first, record.name_last, new Date(record.hire_date).getTime(), record.position));
    }

    static async findById(id) {
        const record = (await Employee.conn.query(`SELECT * FROM employee WHERE id = '${id}'`))[0];
        if (record && id == record.id) {
            return new Employee(
                record.id,
                record.pass_hash,
                record.name_first,
                record.name_last,
                new Date(record.hire_date).getTime(),
                record.position
            );
        }
        return null;
    }

    async load() {
        const record = (await Employee.conn.query(`SELECT * FROM employee WHERE id = '${this.id}'`))[0];
        if (record && this.id == record.id) {
            this.passHash = record.pass_hash;
            this.nameFirst = record.name_first;
            this.nameLast = record.name_last;
            this.hireDate = new Date(record.hire_date).getTime(); // Converts SQL timestamp milliseconds representation of date
            this.position = record.position;
            return true;
        }
        return false;
    }

    async save() {
        const properties = [
            this.passHash,
            this.nameFirst,
            this.nameLast,
            new Date(this.hireDate).toISOString().slice(0, 19).replace('T', ' '), // Converts JavaScript date to string acceptable by SQL
            this.position
        ]
        await Employee.conn.query(`INSERT INTO employee (id, pass_hash, name_first, name_last, hire_date, position) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE pass_hash=?, name_first=?, name_last=?, hire_date=?, position=?`, [this.id, ...properties, ...properties]);
    }

    async delete() {
        return (await Employee.conn.query(`DELETE FROM employee WHERE id = ?`, [this.id])).affectedRows > 0;
    }

    auth(pass) {
        return pass != null ? this.passHash != null && bcrypt.compareSync(pass, String(this.passHash)) : this.passHash == null;
    }
}

module.exports = Employee;