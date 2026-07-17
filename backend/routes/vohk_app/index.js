const express = require('express');
const router = express.Router();

router.use('/auth', require('./authAPI'));
router.use('/twilio', require('./twilioAPI'));
router.use('/device', require('./deviceAPI'));
router.use('/events', require('./events'));
router.use('/admin', require('./propertyAPI'));
router.use('/access-events', require('./accessEventsAPI'));
router.use('/dashboard', require('./dashboardController'));
router.use('/user', require('./userController'));
router.use('/condominium', require('./condominiumController'));

module.exports = router;