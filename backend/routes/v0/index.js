const express = require('express');
const router = express.Router();
// Import all v0 routes
router.use('/user', require('./UserAPI'));
router.use('/ekey', require('./ekeyAPI'));
router.use('/passcode', require('./passcodeAPI'));
router.use('/card', require('./cardAPI'));
router.use('/fingerprint', require('./fingerprintAPI'));
router.use('/record', require('./recordAPI'));
router.use('/gateway', require('./gatewayAPI'));
router.use('/group', require('./groupAPI'));
router.use('/lock', require('./lockAPI'));

module.exports = router;