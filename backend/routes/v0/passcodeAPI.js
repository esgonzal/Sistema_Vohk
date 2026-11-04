const express = require('express');
const router = express.Router();
const passcodeService = require('../../services/v0/passcodeService');

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
        const data = await passcodeService.getLockPasscodes({ accessToken, lockID });
        return res.json(data);
    } catch (error) {
        console.error('getListLock passcodes error:', error);
        return res.status(error.status || 500).json({
            errcode: error.errcode || 'UNKNOWN',
            errmsg: error.message || 'Error fetching lock passcodes'
        });
    }
});
router.post('/get', async (req, res) => {
    const { lockID, type, startDate, name, endDate } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID || !type || !startDate) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await passcodeService.getPasscode({ accessToken, lockID, type, name, startDate, endDate })
        return res.json(data);
    } catch (error) {
        console.error('getPasscode error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error getting a passcode' });
    }
});
router.post('/add', async (req, res) => {
    const { lockID, keyboardPwd, keyboardPwdType, keyboardPwdName, startDate, endDate } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID || !keyboardPwd) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await passcodeService.addPasscode({ accessToken, lockID, keyboardPwd, keyboardPwdType, keyboardPwdName, startDate, endDate })
        return res.json(data);
    } catch (error) {
        console.error('addPasscode error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error adding a passcode' });
    }
});
router.post('/delete', async (req, res) => {
    const { lockID, passcodeID } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID || !passcodeID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await passcodeService.deletePasscode({ accessToken, lockID, passcodeID });
        return res.json(data);
    } catch (error) {
        console.error('deletePasscode error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error deleting a passcode' });
    }
});
router.post('/change', async (req, res) => {
    const { lockID, passcodeID, newName, newCode } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID || !passcodeID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await passcodeService.changePasscode({ accessToken, lockID, passcodeID, newName, newCode });
        return res.json(data);
    } catch (error) {
        console.error('changePasscode error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error changing a passcode' });
    }
});

router.post('/multiplePasscodes', async (req, res) => {
    const { passcodes, selectedLocks } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!Array.isArray(selectedLocks) || selectedLocks.length === 0 || !Array.isArray(passcodes) || passcodes.length === 0) {
        return res.status(400).json({ errmsg: 'Missing selectedLocks or passcodes' });
    }
    try {
        const data = await passcodeService.multiplePasscodes({ accessToken, selectedLocks, passcodes });
        return res.json(data);
    } catch (error) {
        console.error('multiple passcodes error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error adding multiple passcodes' });
    }
});

module.exports = router;
