const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'vohk',
    user: 'vohk_user',
    password: 'vohk_password',
});

module.exports = pool;