var express = require('express');
var router = express.Router();

var g = require('./globalArr');
// var globalArr = [];
/* GET users listing. */
router.get('/', function(req, res, next) {
	// Comment out this line:
  //res.send('respond with a resource');

  // And insert something like this instead:
  console.log("hit users router");
  g.globalArr.push("aa");
  console.log(g.globalArr);
  res.json([{
  	id: 1,
  	username: "samsepi0l"
  }, {
  	id: 2,
  	username: "D0loresH4ze"
  }]);

});

module.exports = router;