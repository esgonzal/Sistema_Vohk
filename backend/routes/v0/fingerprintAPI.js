const express = require('express');
const router = express.Router();
const { getAccessTokenOrFail, buildHeaders } = require('../../utils/ttlock');
const fingerprintController = require('../../controllers/v0/fingerprintController');

router.post('/getListLock', fingerprintController.getLockFingerprintList);
router.post('/rename', fingerprintController.renameFingerprint);
router.post('/delete', fingerprintController.deleteFingerprint);
router.post('/changePeriod', fingerprintController.changeFingerprintPeriod);

module.exports = router;