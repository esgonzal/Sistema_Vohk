const express = require('express');
const router = express.Router();

router.use('/twilio', require('./twilio'));
router.use('/intercom', require('./intercomAPI'));
router.use('/events', require('./events'));

module.exports = router;