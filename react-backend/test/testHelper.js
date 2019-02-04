require('dotenv').config()
let globalVals = require('../routes/globalVals');
var pgp = require('pg-promise')(/*options*/)

var vals = {};

// var connectionProps = {
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT,
//   database: process.env.DB_NAME,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD
// };

// var dbInstance = pgp(connectionProps);
const db = globalVals.dbInstance;

var testHelper = {
  clearTable: async function(tableName) {
    const query = 'delete from ' + tableName;
    await db.none(query)
    .then(() => {
    })
    .catch(error => {
      console.log("Failed to clear table: %s", tableName);
      console.log(error);
    })
  },

  shutdown: async function(){
    await db.$config.pgp.end();
    console.log("Closing connections to db.");
  }

};

module.exports = testHelper;