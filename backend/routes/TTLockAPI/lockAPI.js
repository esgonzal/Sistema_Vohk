const express = require('express');
const router = express.Router();
const axios = require('axios');

// Constants for clientId and clientSecret
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';

router.post('/getListAccount', async (req, res) => {
    let { token, pageNo, pageSize } = req.body;
    try {
        let date = Date.now()
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: token,
            pageNo: pageNo,
            pageSize: pageSize,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/list',
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
router.post('/details', async (req, res) => {
    let { token, lockID } = req.body;
    try {
        let date = Date.now()
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: token,
            lockId: lockID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/detail',
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
router.post('/setAutoLock', async (req, res) => {
    let { token, lockID, seconds } = req.body;
    try {
        let date = Date.now()
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: token,
            lockId: lockID,
            seconds: seconds,
            type: '2',
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/setAutoLockTime',
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
router.post('/transfer', async (req, res) => {
    let { token, receiverUsername, lockIdList } = req.body;
    try {
        let date = Date.now()
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: token,
            receiverUsername: receiverUsername,
            lockIdList: lockIdList,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/transfer',
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