class Table {
    id;
    seats;
    posX;
    posY;
    status;

    constructor(id, seats, posX, posY, status) {
        this.id = id;
        this.seats = seats ?? 0;
        this.posX = posX ?? 0;
        this.posY = posY ?? 0;
        this.status = status ?? 'unoccupied';
    }

    static connectDatabase(conn) {
        this.conn = conn;
        conn.query(`CREATE TABLE IF NOT EXISTS \`table\` (
            id INT PRIMARY KEY,
            seats INT NOT NULL DEFAULT 0,
            pos_x INT NOT NULL DEFAULT 0,
            pos_y INT NOT NULL DEFAULT 0,
            status VARCHAR(10) NOT NULL DEFAULT 'unoccupied',
            CONSTRAINT table_uk_pos
                UNIQUE (pos_x, pos_y)
        )`);
    }

    static async listTables() {
        return (await Table.conn.query(`SELECT * FROM \`table\``)).map(record => new Table(record.id, record.seats, record.pos_x, record.pos_y, record.status));
    }

    static async getTable(id) {
        let table = new Table(id);
        if (await table.load()) return table;
        return null;
    }

    static async addTable(seats, posX, posY, status) {
        let tableIds = (await this.listTables()).map(table => table.id);
        let newId = 0;
        while (tableIds.includes(newId)) newId++;
        let newTable = new Table(newId, seats, posX, posY, status);
        await newTable.save();
        return newTable;
    }

    static async removeTable(id) {
        return (await Table.conn.query(`DELETE FROM \`table\` WHERE id = '${id}'`)).affectedRows > 0;
    }

    async load() {
        const record = (await Table.conn.query(`SELECT * FROM \`table\` WHERE id = '${this.id}'`))[0];
        if (record && this.id == record.id) {
            this.seats = record.seats;
            this.posX = record.pos_x;
            this.posY = record.pos_y;
            this.status = record.status;
            return true;
        }
        return false;
    }

    async save() {
        const properties = [
            this.seats,
            this.posX,
            this.posY,
            this.status
        ]
        await Table.conn.query(`INSERT INTO \`table\` (id, seats, pos_x, pos_y, status) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE seats=?, pos_x=?, pos_y=?, status=?`, [this.id, ...properties, ...properties]);
    }
}

module.exports = Table;