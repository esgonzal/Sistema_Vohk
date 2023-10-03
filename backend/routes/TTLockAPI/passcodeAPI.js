const express = require('express');
const router = express.Router();
const axios = require('axios');

const { accessTokenStorage } = require('./accessTokenStorage'); 
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';

router.post('/getListLock', async (req, res) => {
    let { userID, lockID, pageNo, pageSize } = req.body;
    try {
        let date = Date.now()
        const accessToken = accessTokenStorage[userID] || null;
        if (!accessToken) {
            return res.status(401).json({ error: 'Access token not found for this user' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockID,
            pageNo: pageNo,
            pageSize: pageSize,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/listKeyboardPwd',
            ttlockData,
            { headers }
        );
        //console.log(ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error with TTLock API' });
    }
});
router.post('/get', async (req, res) => {
    let { userID, lockID, type, startDate, name, endDate } = req.body;
    try {
        let date = Date.now()
        const accessToken = accessTokenStorage[userID] || null;
        if (!accessToken) {
            return res.status(401).json({ error: 'Access token not found for this user' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockID,
            keyboardPwdType: type,
            date,
            startDate: startDate,
            keyboardPwdName: name,
            endDate: endDate,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/keyboardPwd/get',
            ttlockData,
            { headers }
        );
        //console.log(ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error with TTLock API' });
    }
});
router.post('/add', async (req, res) => {
    let { userID, lockID, keyboardPwd, keyboardPwdType, keyboardPwdName, startDate, endDate } = req.body;
    try {
        let date = Date.now()
        const accessToken = accessTokenStorage[userID] || null;
        if (!accessToken) {
            return res.status(401).json({ error: 'Access token not found for this user' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockID,
            keyboardPwd: keyboardPwd,
            addType: '2',
            keyboardPwdType: keyboardPwdType,
            date,
            keyboardPwdName: keyboardPwdName,
            startDate: startDate,
            endDate: endDate,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/keyboardPwd/add',
            ttlockData,
            { headers }
        );
        //console.log(ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error with TTLock API' });
    }
});
router.post('/delete', async (req, res) => {
    let { userID, lockID, keyboardPwdId } = req.body;
    try {
        let date = Date.now()
        const accessToken = accessTokenStorage[userID] || null;
        if (!accessToken) {
            return res.status(401).json({ error: 'Access token not found for this user' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockID,
            keyboardPwdId: keyboardPwdId,
            deleteType: '2',
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/keyboardPwd/delete',
            ttlockData,
            { headers }
        );
        //console.log(ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error with TTLock API' });
    }
});
router.post('/change', async (req, res) => {
    let { userID, lockID, keyboardPwdId, newName, newPwd, newStartDate, newEndDate } = req.body;
    try {
        let date = Date.now()
        const accessToken = accessTokenStorage[userID] || null;
        if (!accessToken) {
            return res.status(401).json({ error: 'Access token not found for this user' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockID,
            keyboardPwdId: keyboardPwdId,
            changeType: '2',
            date,
            keyboardPwdName: newName,
            newKeyboardPwd: newPwd,
            startDate: newStartDate,
            endDate: newEndDate,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/keyboardPwd/change',
            ttlockData,
            { headers }
        );
        //console.log(ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error with TTLock API' });
    }
});
// Export the TTLock router
module.exports = router;