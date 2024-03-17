class TimeClock {
    employeeId;

    constructor(employeeId) {
        this.employeeId = employeeId;
    }

    static connectDatabase(conn) {
        this.conn = conn;
        conn.query(`
            CREATE TABLE IF NOT EXISTS timeclock (
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP DEFAULT NULL,
                employee_id INT NOT NULL,
                CONSTRAINT timeclock_pk
                    PRIMARY KEY (start_time, employee_id),
                CONSTRAINT timeclock_fk_employee_id
                    FOREIGN KEY (employee_id) REFERENCES employee (id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
            )
        `);
    }

    async clockIn() {
        let activePeriod = await this.getActivePeriod();
        if (activePeriod) return null;
        let startTime = Date.now();
        return await this.addPeriod(startTime);
    }

    async clockOut() {
        let activePeriod = await this.getActivePeriod();
        if (!activePeriod) return null;
        activePeriod.endTime = Date.now();
        await activePeriod.save();
        return activePeriod;
    }

    async getPeriod(startTime) {
        return await this.getDay(startTime).getPeriod(startTime);
    }

    async addPeriod(startTime, endTime) {
        return await this.getDay(startTime).addPeriod(startTime, endTime);
    }

    async getTotalTime() {
        return (await TimeClock.conn.query(`
            SELECT SUM(TIMESTAMPDIFF(MICROSECOND, start_time, CASE WHEN end_time IS NOT NULL THEN end_time ELSE CURRENT_TIMESTAMP END) / 1000) 
                AS total_time 
                FROM timeclock 
                WHERE employee_id = ?
        `, [this.employeeId]))[0].total_time;
    }

    getDay(time) {
        return new TimeClockDay(this, time % (24 * 60 * 60 * 1000));
    }

    async listPeriods(limit, offset) {
        const periodRecords = (await TimeClock.conn.query(`
            SELECT start_time, end_time 
                FROM timeclock 
                WHERE employee_id = ?
                ORDER BY start_time DESC
                LIMIT ? OFFSET ?
        `, [this.employeeId, limit ?? 100, offset ?? 0])).map(record => ({
            startTime: new Date(record.start_time).getTime(),
            endTime: record.end_time != null ? new Date(record.end_time).getTime() : null
        }));
        const days = new Map(periodRecords.map(record => [record.startTime % (24 * 60 * 60 * 1000), this.getDay(record.startTime)]));
        return periodRecords.map(record => new TimeClockPeriod(days[record.startTime % (24 * 60 * 60 * 1000)], record.startTime, record.endTime));
    }

    async getActivePeriod() {
        let record = (await TimeClock.conn.query(`
            SELECT start_time 
                FROM timeclock 
                WHERE employee_id = ?
                    AND end_time IS NULL
                LIMIT 1
        `, [this.employeeId]))[0];
        if (!record) return null;
        return await this.getPeriod(new Date(record.start_time).getTime());
    }
}

class TimeClockDay {
    timeClock;
    day;

    constructor(timeClock, day) {
        this.timeClock = timeClock;
        this.day = day;
    }

    async getPeriod(startTime) {
        let period = new TimeClockPeriod(this, startTime);
        if (await period.load()) return period;
        return null;
    }

    async addPeriod(startTime, endTime) {
        let period = new TimeClockPeriod(this, startTime, endTime);
        await period.save();
        return period;
    }

    async getTotalTime() {
        return (await TimeClock.conn.query(`
            SELECT SUM(TIMESTAMPDIFF(MICROSECOND, start_time, CASE WHEN end_time IS NOT NULL THEN end_time ELSE CURRENT_TIMESTAMP END) / 1000) 
                AS total_time 
                FROM timeclock 
                WHERE employee_id = ?
                    AND start_time >= ? 
                    AND start_time < ?
        `, [this.timeClock.employeeId, new Date(this.day).toISOString().split('T')[0], new Date(this.day + (24 * 60 * 60 * 1000)).toISOString().split('T')[0]]))[0].total_time;
    }

    async listPeriods(limit, offset) {
        const periodRecords = await TimeClock.conn.query(`
            SELECT start_time, end_time 
                FROM timeclock 
                WHERE employee_id = ? 
                    AND start_time >= ? 
                    AND start_time < ?
                ORDER BY start_time DESC
                LIMIT ? OFFSET ?
        `, [this.timeClock.employeeId, new Date(this.day).toISOString().split('T')[0], new Date(this.day + (24 * 60 * 60 * 1000)).toISOString().split('T')[0], limit ?? 100, offset ?? 0]);
        return periodRecords.map(record => new TimeClockPeriod(this, new Date(record.start_time).getTime(), record.end_time != null ? new Date(record.end_time).getTime() : null));
    }
}

class TimeClockPeriod {
    timeClockDay;
    startTime;
    endTime;

    constructor(timeClockDay, startTime, endTime) {
        this.timeClockDay = timeClockDay;
        this.startTime = startTime ?? Date.now();
        this.endTime = endTime ?? null;
    }

    async load() {
        const record = (await TimeClock.conn.query(`
            SELECT * 
                FROM timeclock 
                WHERE employee_id = ? 
                    AND start_time = ?
        `, [this.timeClockDay.timeClock.employeeId, new Date(this.startTime).toISOString().slice(0, 19).replace('T', ' ')]))[0];
        if (record) {
            this.endTime = record.end_time != null ? new Date(record.end_time).getTime() : null; // Converts SQL timestamp milliseconds representation of date
            return true;
        }
        return false;
    }

    async save() {
        const properties = [
            this.endTime ? new Date(this.endTime).toISOString().slice(0, 19).replace('T', ' ') : null,
        ]
        await TimeClock.conn.query(`
            INSERT INTO timeclock (start_time, employee_id, end_time) 
                VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
                end_time=?
        `, [new Date(this.startTime).toISOString().slice(0, 19).replace('T', ' '), this.timeClockDay.timeClock.employeeId, ...properties, ...properties]);
    }
}

module.exports = TimeClock;