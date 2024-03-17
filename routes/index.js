var express = require('express');
var router = express.Router();
var Employee = require('../models/employee')
const databaseController = require('../controllers/databaseController.js');

/* GET home page. */
router.get('/', async function (req, res) {
  res.render('index', { Employee });
});

/* GET home page. */
router.get('/signedin', async function (req, res) {
  if (req.session.returnTo != null && req.session.returnTo != '/') {
    res.redirect(req.session.returnTo);
  } else {
    res.redirect('/profile');
  }
});

module.exports = router;
