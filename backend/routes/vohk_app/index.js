// vohk_app index
const express = require('express');
const router = express.Router();

router.use('/auth', require('./authAPI'));
router.use('/twilio', require('./twilioAPI'));
router.use('/media', require('./mediaController'));
router.use('/alma', require('./almaController'));

router.use('/activities', require('./activityController'));
router.use('/vision/events', require('./visionEventController'));
router.use('/invitation', require('./invitationController'));
router.use('/encomiendas', require('./encomiendaController'));

// ANGULAR TABS
router.use('/dashboard', require('./dashboardController'));
router.use('/condominiums', require('./condominiumController'));
router.use('/users', require('./userController'));
router.use('/units', require('./unitController'));
router.use('/devices', require('./hikvisionQrController'));
router.use('/devices', require('./deviceController'));
router.use('/concierge', require('./conciergeController'));

module.exports = router;
