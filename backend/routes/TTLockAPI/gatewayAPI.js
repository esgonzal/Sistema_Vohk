const express = require('express');
const router = express.Router();
const axios = require('axios');

// Constants for clientId and clientSecret
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';

router.post('/getListLock', async (req, res) => {
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
            'https://euapi.ttlock.com/v3/gateway/listByLock',
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
            'https://euapi.ttlock.com/v3/gateway/list',
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
router.post('/unlock', async (req, res) => {
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
            'https://euapi.ttlock.com/v3/lock/unlock',
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
router.post('/lock', async (req, res) => {
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
            'https://euapi.ttlock.com/v3/lock/lock',
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
router.post('/getTime', async (req, res) => {
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
            'https://euapi.ttlock.com/v3/lock/queryDate',
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
router.post('/adjustTime', async (req, res) => {
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
            'https://euapi.ttlock.com/v3/lock/updateDate',
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