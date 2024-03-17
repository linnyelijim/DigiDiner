var express = require('express');
var router = express.Router();

var utils = require('../../utils');
var Employee = require('../../models/employee');
var Table = require('../../models/table');

// Used to verify user is signed in and a manager
function requireSession(req, res, next) {
    if (!req.employee) {
        res.status(401).json({
            'error': "Not Signed In"
        });
        return;
    }
    if (!req.employee.position.includes("manager")) {
        res.status(403).json({
            'error': "Not Authorized"
        });
        return;
    }
    next();
}

/* GET employee list */
router.get('/employee/list', requireSession, utils.asyncHandler(async function (req, res) {
    let employeeList = await Employee.listEmployees();
    res.status(200).json(await Promise.all(employeeList.map(async employee => ({
        'id': employee.id,
        'nameFirst': employee.nameFirst,
        'nameLast': employee.nameLast,
        'hireDate': employee.hireDate,
        'position': employee.position
    }))));
}));

/* POST create new employee */
router.post('/employee/create', requireSession, utils.asyncHandler(async function (req, res) {
    let id;
    let newEmployee;
    do {
        id = Math.floor(Math.random() * 2147483647);
        newEmployee = new Employee(id);
    } while (await newEmployee.load());
    await newEmployee.save();
    res.status(201).json({
        'id': newEmployee.id
    });
}));

/* PUT update existing employee */
router.put('/employee/:id', requireSession, utils.asyncHandler(async function (req, res) {
    const id = parseInt(req.params.id);
    const { nameFirst, nameLast, position } = req.body;

    try {
        const employee = await Employee.findById(id);
        if (!employee) {
            res.status(404).json({ 'error': 'Employee not found' });
            return;
        }

        if (employee.nameFirst != null && nameFirst != null) employee.nameFirst = nameFirst;
        if (employee.nameFirst != null && nameLast != null) employee.nameLast = nameLast;
        if (position != null) employee.position = position;

        await employee.save();
        res.status(200).json({ 'message': 'Employee updated successfully' });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ 'error': 'Internal server error' });
    }
}));

/* DELETE existing employee */
router.delete('/employee/:id', requireSession, utils.asyncHandler(async function (req, res) {
    const id = req.params.id;

    try {
        const employee = await Employee.findById(id);
        if (!employee) {
            res.status(404).json({ 'error': 'Employee not found' });
            return;
        }

        const success = await employee.delete();
        if (success) {
            res.status(200).json({ 'message': 'Employee deleted successfully' });
        } else {
            res.status(500).json({ 'error': 'Failed to delete employee' });
        }
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ 'error': 'Internal server error' });
    }
}));

/* POST new table */
router.post('/table', requireSession, utils.asyncHandler(async function (req, res) {
    if (req.body.seats == null) {
        res.status(400).json({
            'error': "Missing Required Fields"
        });
        return;
    }
    let table = await Table.addTable(req.body.seats, req.body.posX, req.body.posY);
    res.status(201).json({
        'id': table.id,
        'seats': table.seats,
        'posX': table.posX,
        'posY': table.posY,
        'status': table.status
    });
}));

module.exports = router;
