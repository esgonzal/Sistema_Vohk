// vohk_app index
const express = require('express');
const router = express.Router();

router.use('/auth', require('./authAPI'));
router.use('/twilio', require('./twilioAPI'));
router.use('/devices', require('./deviceAPI'));
router.use('/events', require('./events'));
router.use('/admin', require('./propertyAPI'));
router.use('/invitation', require('./invitationController'));

// ANGULAR TABS
router.use('/dashboard', require('./dashboardController'));
router.use('/condominiums', require('./condominiumController'));
router.use('/users', require('./userController'));
router.use('/units', require('./unitController'));
router.use('/device', require('./deviceController'));
router.use('/concierge', require('./conciergeController'));

module.exports = router;