const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authMiddleware');
router.use(authenticate);

module.exports = router;