var express = require('express');
var router = express.Router();

var g = require('./globalArr');

/* GET home page. */
router.get('/', function(req, res, next) {
	console.log('hit index router');
	console.log(g.globalArr);
  res.render('index', { title: 'Express' });
});

module.exports = router;
