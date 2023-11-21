const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/get', async (req, res) => {
    let { clientId, accessToken, lockId, keyboardPwdType, keyboardPwdName, startDate, endDate, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            keyboardPwdType: keyboardPwdType,
            keyboardPwdName: keyboardPwdName,
            startDate: startDate,
            endDate: endDate,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
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
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/add', async (req, res) => {
    let { clientId, accessToken, lockId, keyboardPwd, keyboardPwdType, keyboardPwdName, startDate, endDate, addType, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            keyboardPwd: keyboardPwd,
            keyboardPwdType: keyboardPwdType,
            keyboardPwdName: keyboardPwdName,
            startDate: startDate,
            endDate: endDate,
            addType: addType,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
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
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/delete', async (req, res) => {
    let { clientId, accessToken, lockId, keyboardPwdId, deleteType, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            keyboardPwdId: keyboardPwdId,
            deleteType: deleteType,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
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
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/change', async (req, res) => {
    let { clientId, accessToken, lockId, keyboardPwdId, keyboardPwdName, newKeyboardPwd, startDate, endDate, changeType, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            keyboardPwdId: keyboardPwdId,
            keyboardPwdName: keyboardPwdName,
            newKeyboardPwd: newKeyboardPwd,
            startDate: startDate,
            endDate: endDate,
            changeType: changeType,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
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
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});

module.exports = router;