var express = require('express');
var router = express.Router();
var Employee = require('../models/employee');

// Used to verify user is signed in
function requireSession(req, res, next) {
  if (!req.employee) {
      req.session.returnTo = req.originalUrl;
      res.redirect('/');
      return;
  }
  next();
}

/* GET profile page for the currently signed-in employee. */
router.get('/', requireSession, function (req, res) {
  res.status(200).render('profile', { employee: req.employee });
});

module.exports = router;