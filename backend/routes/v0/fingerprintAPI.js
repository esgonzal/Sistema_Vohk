const express = require('express');
const router = express.Router();
const fingerprintService = require('../../services/v0/fingerprintService');

router.post('/getListLock', async (req, res) => {
    const { lockID } = req.body || {};
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID) {
        return res.status(400).json({ errmsg: 'Missing lockID' });
    }
    try {
        const data = await fingerprintService.getLockFingerprints({ accessToken, lockID });
        return res.json(data);
    } catch (error) {
        console.error('getLockFingerprintList error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error fetching lock fingerprints' });
    }
});
router.post('/rename', async (req, res) => {
    const { lockID, fingerprintID, newName } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID || !fingerprintID || !newName) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await fingerprintService.rename({ accessToken, lockID, fingerprintID, newName });
        return res.json(data);
    } catch (error) {
        console.error('renameFingerprint error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error renaming fingerprint' });
    }
});
router.post('/delete', async (req, res) => {
    const { lockID, fingerprintID } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID || !fingerprintID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await fingerprintService.deleteFingerprint({ accessToken, lockID, fingerprintID });
        return res.json(data);
    } catch (error) {
        console.error('deleteFingerprint error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error deleting fingerprint' });
    }
});
router.post('/changePeriod', async (req, res) => {
    const { lockID, fingerprintID, newStartDate, newEndDate } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID || !fingerprintID || !newStartDate || !newEndDate) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await fingerprintService.changeFingerprintPeriod({ accessToken, lockID, fingerprintID, newStartDate, newEndDate });
        return res.json(data);
    } catch (error) {
        console.error('changeFingerprintPeriod error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error changing fingerprint period' });
    }
});

module.exports = router;