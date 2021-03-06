require('dotenv').config();
var cors = require('cors');
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var roomsRouter = require('./routes/rooms');
var charactersRouter = require('./routes/characters');

var app = express();

app.use(cors({
  credentials: true, 
  origin: '*',
  preflightContinue: true  
}));

app.options("/*", function(req, res, next){
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  res.send(200);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/users', usersRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/characters', charactersRouter);

if(process.env.PRODUCTION){
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.get("/*", function(req, res){
    console.log("serve index.html");
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  })
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  //console.log(err.message);
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
