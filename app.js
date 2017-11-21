const moment = require('moment');
const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const passport = require('passport');
const Raven = require('raven');
const config = require('./config.json');
const db = require('./db/models');
const auth = require('./helpers/auth');
Raven.config(process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN).install();

var app = express();
app.locals.moment = moment;
app.locals.moment_format = config.moment_format;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(Raven.requestHandler());
auth(passport);
app.use(passport.initialize());
app.use(function(req, res, next) {
  req.db = db;
  next();
});

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieSession({
  name: 'session',
  keys: [process.env.COOKIE_SECRET]
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
  res.locals.url   = req.originalUrl;
  next();
});

app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(Raven.errorHandler());
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
