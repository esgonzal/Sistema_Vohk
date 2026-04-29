const express = require('express');
const router = express.Router();
const axios = require('axios');
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_BASE_URL = 'https://euapi.ttlock.com/v3';
const { getAccessTokenOrFail, buildHeaders } = require('../../utils/ttlock');
const fingerprintController = require('../../controllers/v0/fingerprintController');

router.post('/getListLock', fingerprintController.getLockFingerprintList);
router.post('/rename', fingerprintController.renameFingerprint);
router.post('/delete', fingerprintController.deleteFingerprint);
router.post('/changePeriod', fingerprintController.changeFingerprintPeriod);

module.exports = router;