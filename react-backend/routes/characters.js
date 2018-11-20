var express = require('express');
var cors = require('cors');
var router = express.Router();
var pgp = require('pg-promise')(/*options*/)
// var db = pgp('postgres://Cze Wen:admin@localhost:5432/granblue')
var globalVals = require('./globalVals');
var db = globalVals.dbInstance;

router.all('*', cors());

router.get('/', function(req, res, next){
  db.any('SELECT name from characters')
    .then(function(data){
      res.status(200).json(data);
    })
    .catch(function(error){
      console.log(error);
    });
})

router.get('/character', function(req, res, next){
  if(!req.query.name){
    return res.status(400).end();
  }
  else{
    db.one('SELECT * FROM CHARACTERS WHERE NAME=${name}', req.query)
      .then(result => {
        res.status(200).json(result);
      })
      .catch(error => {
        console.log(error);
      })
  }
})


module.exports = router;