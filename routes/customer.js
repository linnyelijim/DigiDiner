var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res) {
  res.status(200).render('customer');
});

module.exports = router;
