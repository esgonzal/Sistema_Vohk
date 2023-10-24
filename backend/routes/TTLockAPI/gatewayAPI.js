const express = require('express');
const router = express.Router();
const axios = require('axios');
const { accessTokenStorage } = require('./accessTokenStorage'); 
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';

router.post('/getListLock', async (req, res) => {
    let { userID, lockID } = req.body;
    try {
        let date = Date.now()
        const accessToken = accessTokenStorage[userID] || null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/gateway/listByLock',
            ttlockData,
            { headers }
        );
        //console.log(ttlockResponse.data)
        if (typeof ttlockResponse === 'object' && ttlockResponse.data.hasOwnProperty('list')) {
            res.json(ttlockResponse.data);
        } else {
            res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/getListAccount', async (req, res) => {
    let { userID, pageNo, pageSize } = req.body;
    try {
        let date = Date.now()
        const accessToken = accessTokenStorage[userID] || null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            pageNo: pageNo,
            pageSize: pageSize,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/gateway/list',
            ttlockData,
            { headers }
        );
        //console.log(ttlockResponse.data)
        if (typeof ttlockResponse === 'object' && ttlockResponse.data.hasOwnProperty('list')) {
            res.json(ttlockResponse.data);
        } else {
            res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/unlock', async (req, res) => {
    let { userID, lockID } = req.body;
    try {
        let date = Date.now()
        const accessToken = accessTokenStorage[userID] || null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/unlock',
            ttlockData,
            { headers }
        );
        //console.log(ttlockResponse.data)
        res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/lock', async (req, res) => {
    let { userID, lockID } = req.body;
    try {
        let date = Date.now()
        const accessToken = accessTokenStorage[userID] || null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/lock',
            ttlockData,
            { headers }
        );
        //console.log(ttlockResponse.data)
        res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/getTime', async (req, res) => {
    let { userID, lockID } = req.body;
    try {
        let date = Date.now()
        const accessToken = accessTokenStorage[userID] || null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/queryDate',
            ttlockData,
            { headers }
        );
        //console.log(ttlockResponse.data)
        if (typeof ttlockResponse === 'object' && ttlockResponse.data.hasOwnProperty('date')) {
            res.json(ttlockResponse.data);
        } else {
            res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/adjustTime', async (req, res) => {
    let { userID, lockID } = req.body;
    try {
        let date = Date.now()
        const accessToken = accessTokenStorage[userID] || null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/updateDate',
            ttlockData,
            { headers }
        );
        //console.log(ttlockResponse.data)
        if (typeof ttlockResponse === 'object' && ttlockResponse.data.hasOwnProperty('date')) {
            res.json(ttlockResponse.data);
        } else {
            res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});

module.exports = router;