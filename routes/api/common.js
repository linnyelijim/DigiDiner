var express = require('express');
var bcrypt = require('bcrypt');
var router = express.Router();

var utils = require('../../utils');
var Employee = require('../../models/employee');
var TimeClock = require('../../models/timeclock');

// Used to verify user is signed in
function requireSession(req, res, next) {
    if (!req.employee) {
        res.status(401).json({
            'error': "Not Signed In"
        });
        return;
    }
    next();
}

/* POST new employee signup */
router.post('/employee/signup', utils.asyncHandler(async function (req, res) {
    if (req.body.id == null || !req.body.nameFirst || !req.body.nameLast) {
        res.status(400).json({
            'error': "Missing Required Fields"
        });
        return;
    }
    let newEmployee = new Employee(req.body.id);
    if (!(await newEmployee.load()) || newEmployee.nameFirst) {
        res.status(403).json({
            'error': "Invalid Employee ID"
        });
        return;
    }
    newEmployee.passHash = req.body.pass != null ? await bcrypt.hash(req.body.pass, Employee.passSaltRounds) : null;
    newEmployee.nameFirst = req.body.nameFirst;
    newEmployee.nameLast = req.body.nameLast;
    await newEmployee.save();
    res.status(201).json({
        'id': newEmployee.id,
        'nameFirst': newEmployee.nameFirst,
        'nameLast': newEmployee.nameLast,
        'hireDate': newEmployee.hireDate,
        'position': newEmployee.position
    });
}));

/* POST employee auth */
router.post('/employee/auth', utils.asyncHandler(async function (req, res) {
    if (req.body.id == null) {
        res.status(400).json({
            'error': "Missing Required Fields"
        });
        return;
    }
    let employee = new Employee(req.body.id);
    if (!(await employee.load())) {
        res.status(403).json({
            'error': "Invalid Employee ID or Password"
        });
        return;
    } else if (!employee.nameFirst) {
        res.status(403).json({
            'error': "Account Needs Signup"
        });
        return;
    } else if (!employee.auth(req.body.pass)) {
        res.status(403).json({
            'error': "Invalid Employee ID or Password"
        });
        return;
    }
    if (req.body.remember) {
        req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // One Week
        req.session.cookie.expires = new Date(Date.now() + req.session.cookie.maxAge);
    }
    req.session.employeeId = employee.id;
    res.status(200).json({
        'id': employee.id,
        'nameFirst': employee.nameFirst,
        'nameLast': employee.nameLast,
        'hireDate': employee.hireDate,
        'position': employee.position
    });
}));

/* GET employee */
router.get('/employee', requireSession, utils.asyncHandler(async function (req, res) {
    res.status(200).json({
        'id': req.employee.id,
        'nameFirst': req.employee.nameFirst,
        'nameLast': req.employee.nameLast,
        'hireDate': req.employee.hireDate,
        'position': req.employee.position
    });
}));

/* POST employee time clock in */
router.post('/employee/clockin', requireSession, utils.asyncHandler(async function (req, res) {
    let period = await req.employee.timeClock.clockIn();
    if (period) {
        res.status(200).json({
            'status': "Success",
            'startTime': period.startTime
        });
    } else {
        res.status(400).json({
            'status': "Failed",
            'reason': "Already Clocked In"
        });
    }
}));

/* POST employee time clock out */
router.post('/employee/clockout', requireSession, utils.asyncHandler(async function (req, res) {
    let period = await req.employee.timeClock.clockOut();
    if (period) {
        res.status(200).json({
            'status': "Success",
            'startTime': period.startTime,
            'endTime': period.endTime
        });
    } else {
        res.status(400).json({
            'status': "Failed",
            'reason': "Not Clocked In"
        });
    }
}));

/* GET employee time clock status */
router.get('/employee/clock', requireSession, utils.asyncHandler(async function (req, res) {
    const activePeriod = await req.employee.timeClock.getActivePeriod();
    const periods = await req.employee.timeClock.listPeriods(req.query.limit, req.query.offset)
    res.status(200).json({
        'clockedIn': activePeriod != null,
        'activePeriod': activePeriod != null ? {
            'startTime': activePeriod.startTime
        } : undefined,
        'periods': periods.filter(period => period.endTime != null).map(period => ({
            'startTime': period.startTime,
            'endTime': period.endTime
        }))
    });
}));

module.exports = router;
