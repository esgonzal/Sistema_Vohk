const express = require('express');
const router = express.Router();
const pool = require('../database/db');

router.get('/db-test', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT NOW()'
        );
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            error: err.message
        });
    }
});

module.exports = router;