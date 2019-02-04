
var pgp = require('pg-promise')(/*options*/)

var vals = {};

const dbName = process.env.NODE_ENV != 'test' ? 
  process.env.DB_NAME : process.env.DB_NAME_TEST;

var connectionProps = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: dbName,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};

vals["connectionProps"] = connectionProps;
vals["dbInstance"] = pgp(connectionProps);

module.exports = vals;