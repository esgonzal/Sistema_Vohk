const express = require('express');
const router = express.Router();

router.use('/twilio', require('./twilio'));
router.use('/device', require('./deviceAPI'));
router.use('/events', require('./events'));
router.use('/admin', require('./propertyAPI'));

module.exports = router;