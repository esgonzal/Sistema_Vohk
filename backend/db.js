const pgp = require('pg-promise')();
const db = pgp({
  user: 'postgres',
  password: 'qazqaz1!',
  host: 'localhost',
  port: '5432',
  database: 'Vohk',
});

module.exports = db;
