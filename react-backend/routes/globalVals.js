
var pgp = require('pg-promise')(/*options*/)

var vals = {};
vals["dbInstance"] = pgp(process.env.DB_STRING);

module.exports = vals;