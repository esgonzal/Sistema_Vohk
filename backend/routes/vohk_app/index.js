// vohk_app index
const express = require('express');
const router = express.Router();

router.use('/auth', require('./authAPI'));
router.use('/twilio', require('./twilioAPI'));

router.use('/events', require('./events'));
router.use('/invitation', require('./invitationController'));

// ANGULAR TABS
router.use('/dashboard', require('./dashboardController'));
router.use('/condominiums', require('./condominiumController'));
router.use('/users', require('./userController'));
router.use('/units', require('./unitController'));
router.use('/devices', require('./deviceController'));
//router.use('/devices', require('./deviceAPI'));
router.use('/concierge', require('./conciergeController'));

module.exports = router;