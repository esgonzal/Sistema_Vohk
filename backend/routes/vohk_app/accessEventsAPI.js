const express = require('express');
const router = express.Router();

// POST /app/access-events/push  — receives real-time events from the intercom
router.post('/push', (req, res) => {
    console.log('[INTERCOM EVENT]', JSON.stringify(req.body, null, 2));
    res.status(200).json({ statusCode: 1 });
});

module.exports = router;