
var pgp = require('pg-promise')(/*options*/)

var vals = {};

var connectionProps = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};

vals["connectionProps"] = connectionProps;
vals["dbInstance"] = pgp(connectionProps);

module.exports = vals;