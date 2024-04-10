const mysql = require("mysql");

const database = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "Mdlove@123",
  database: "new",
});

module.exports = database;
