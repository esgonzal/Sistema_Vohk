const express = require('express');
const router = express.Router();
// Import all v1 routes
router.use('/user', require('./userAPI'));
router.use('/lock', require('./lockAPI'));
router.use('/ekey', require('./ekeyAPI'));
router.use('/passcode', require('./passcodeAPI'));
router.use('/fingerprint', require('./fingerprintAPI'));
router.use('/group', require('./groupAPI'));

module.exports = router;