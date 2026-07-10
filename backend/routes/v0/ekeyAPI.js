const express = require('express');
const router = express.Router();
const axios = require('axios');
const moment = require('moment-timezone');
const md5 = require('md5');
const { accessTokenStorage } = require('./accessTokenStorage');
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_CLIENT_SECRET = '33b556bdb803763f2e647fc7a357dedf';
const URL = 'https://api.vohk.cl';
//const URL = 'http://localhost:8080';
const TTLOCK_BASE_URL = 'https://euapi.ttlock.com/v3';
const { getAccessTokenOrFail, buildHeaders } = require('../../utils/ttlock');
const ekeyService = require('../../services/v0/ekeyService');

router.post('/list', async (req, res) => {
    const { groupID } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    try {
        const data = await ekeyService.getEkeysAccount({ accessToken, groupID });
        return res.json(data);
    } catch (error) {
        if (error.ttlockResponse) {
            return res.status(401).json(error.ttlockResponse);
        }
        console.error(error);
        return res.status(error.status || 500).json({
            errcode: error.errcode || 'UNKNOWN',
            errmsg: error.message || 'Error getting ekeys from account'
        });
    }
});
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
        const data = await ekeyService.getLockEkeys({ accessToken, lockID });
        return res.json(data);
    } catch (error) {
        console.error('getListLock ekeys error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error fetching lock ekeys' });
    }
});
router.post('/delete', async (req, res) => {
    const { keyID } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!keyID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await ekeyService.deleteEkey({ accessToken, keyID });
        return res.json(data);
    } catch (error) {
        console.error('deleteEkey ekeys error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error deleting ekey' });
    }
});
router.post('/authorize', async (req, res) => {
    const { lockID, keyID } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID || !keyID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await ekeyService.authorizeEkey({ accessToken, lockID, keyID });
        return res.json(data);
    } catch (error) {
        console.error('authorizeEkey error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error authorizing ekey' });
    }
});
router.post('/unauthorize', async (req, res) => {
    const { lockID, keyID } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID || !keyID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await ekeyService.unauthorizeEkey({ accessToken, lockID, keyID });
        return res.json(data);
    } catch (error) {
        console.error('authorizeEkey error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error unauthorizing ekey' });
    }
});
router.post('/freeze', async (req, res) => {
    const { keyID } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!keyID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await ekeyService.freezeEkey({ accessToken, keyID });
        return res.json(data);
    } catch (error) {
        console.error('freezeEkey error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error freezing ekey' });
    }
});
router.post('/unfreeze', async (req, res) => {
    const { keyID } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!keyID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await ekeyService.unfreezeEkey({ accessToken, keyID });
        return res.json(data);
    } catch (error) {
        console.error('unfreezeEkey error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error unfreezing ekey' });
    }
});
router.post('/modify', async (req, res) => {
    const { keyID, newName } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!keyID || !newName) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await ekeyService.modifyEkey({ accessToken, keyID, newName });
        return res.json(data);
    } catch (error) {
        console.error('modifyEkey error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error modifying ekey' });
    }
});
router.post('/changePeriod', async (req, res) => {
    const { keyID, newStartDate, newEndDate } = req.body;
    if (keyID == null || newStartDate == null || newEndDate == null) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    try {
        const data = await ekeyService.changePeriod({ accessToken, keyID, newStartDate, newEndDate });
        return res.json(data);
    } catch (error) {
        console.error('changePeriodEkey error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error changing ekey period' });
    }
});
router.post('/sendMany', async (req, res) => {
    const { locks, receiverName, keyName, startDate, endDate, keyRight, remoteEnable, notifyEmail, email } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!locks || !receiverName || !keyName || startDate == null || endDate == null) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await ekeyService.sendMany({ accessToken, locks, receiverName, keyName, startDate, endDate, keyRight, remoteEnable, notifyEmail, email })
        return res.json(data);
    } catch (error) {
        console.error('sendMany error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error sending many ekey' });
    }
});
router.post('/sendMultiple', async (req, res) => {
    const { locks, receivers, startDate, endDate, keyRight, remoteEnable, notifyEmail } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!Array.isArray(locks) || locks.length === 0 || !Array.isArray(receivers) || receivers.length === 0 || startDate == null || endDate == null) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await ekeyService.sendMultiple({ accessToken, locks, receivers, startDate, endDate, keyRight, remoteEnable, notifyEmail });
        return res.json(data);
    } catch (error) {
        console.error("sendMultiple error:", error);
        return res.status(error.status || 500).json({ errcode: error.errcode || "UNKNOWN", errmsg: error.message || "Error sending multiple ekeys" });
    }
});

router.post('/send', async (req, res) => {
    const { lockID, receiverName, keyName, startDate, endDate, remoteEnable, keyRight, keyType, startDay, endDay } = req.body;
    console.log(req.body);
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID || !receiverName, !keyName || !startDate) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        //const data = await ekeyService.sendEkey({ accessToken, lockID, receiverName, keyName, startDate, endDate, remoteEnable, keyRight, keyType, startDay, endDay, weekDays })
        //console.log('sendEkey response:', data);
        //return res.json(data);
    } catch (error) {
        console.error('sendEkey error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error sending ekey' });
    }
});
router.post('/send2', async (req, res) => {
    let { userID, selectedLocks, receiverName, keyName, startDate, endDate, remoteEnable, keyRight } = req.body;
    try {
        let date = Date.now()
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        const locksResults = [];
        for (const lock of selectedLocks) {
            try {
                let ttlockData = {
                    clientId: TTLOCK_CLIENT_ID,
                    accessToken: accessToken,
                    lockId: lock.id,
                    receiverUsername: receiverName,
                    keyName: keyName,
                    startDate: startDate,
                    endDate: endDate,
                    remoteEnable: remoteEnable,
                    keyRight: keyRight,
                    createUser: 1,
                    date: date,
                };
                let headers = {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${accessToken}`
                };
                let ttlockResponse = await axios.post(
                    'https://euapi.ttlock.com/v3/key/send',
                    ttlockData, { headers }
                );
                if (typeof ttlockResponse === 'object' &&
                    ttlockResponse.data.hasOwnProperty('keyId') &&
                    typeof ttlockResponse.data.keyId === 'number') { //Send ekey was successful
                    locksResults.push({
                        lockID: lock.id,
                        lockAlias: lock.alias,
                        success: true
                    })
                } else { //Send ekey was unsuccessful
                    locksResults.push({
                        lockID: lock.id,
                        lockAlias: lock.alias,
                        errcode: ttlockResponse.data.errcode,
                        success: false
                    })
                }
            } catch (lockError) {
                console.error(lockError);
                locksResults.push({
                    lockID: lock.id,
                    lockAlias: lock.alias,
                    errcode: lockError.message || 'Error calling TTLock API'
                });
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});

module.exports = router;