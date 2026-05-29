const express = require('express');
const router = express.Router();
// Import all v1 routes
router.use('/twilio', require('./twilio'));
router.use('/intercom', require('./intercomAPI'));
router.use('/events', require('./events'));

module.exports = router;