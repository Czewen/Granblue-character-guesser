var pgp = require('pg-promise')(/*options*/)

var vals = {
  dbAddress: "postgres://Cze Wen:admin@localhost:5432/granblue"
};
vals["dbInstance"] = pgp(vals.dbAddress);

module.exports = vals;