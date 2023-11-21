const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/list', async (req, res) => {
    let { clientId, accessToken, lockAlias, groupId, pageNo, pageSize, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockAlias: lockAlias,
            groupId: groupId,
            pageNo: pageNo,
            pageSize: pageSize,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
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
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/listKey', async (req, res) => {
    let { clientId, accessToken, lockId, pageNo, pageSize, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            pageNo: pageNo,
            pageSize: pageSize,
            date: date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/listKey',
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
router.post('/listKeyboardPwd', async (req, res) => {
    let { clientId, accessToken, lockId, pageNo, pageSize, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            pageNo: pageNo,
            pageSize: pageSize,
            date: date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
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
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/detail', async (req, res) => {
    let { clientId, accessToken, lockId, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
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
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/delete', async (req, res) => {
    let { clientId, accessToken, lockId, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/delete',
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
router.post('/rename', async (req, res) => {
    let { clientId, accessToken, lockId, lockAlias, date} = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            lockAlias: lockAlias,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/rename',
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
router.post('/transfer', async (req, res) => {
    let { clientId, accessToken, receiverUsername, lockIdList, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            receiverUsername: receiverUsername,
            lockIdList: lockIdList,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
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
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/setAutoLockTime', async (req, res) => {
    let { clientId, accessToken, lockId, seconds, type, date} = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            seconds: seconds,
            type: type,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
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
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/unlock', async (req, res) => {
    let { clientId, accessToken, lockId, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            date: date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
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
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/lock', async (req, res) => {
    let { clientId, accessToken, lockId, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            date: date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
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
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/queryOpenState', async (req, res) => {
    let { clientId, accessToken, lockId, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            date: date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/queryOpenState',
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
router.post('/queryDate', async (req, res) => {
    let { clientId, accessToken, lockId, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
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
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/updateDate', async (req, res) => {
    let { clientId, accessToken, lockId, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            date: date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
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
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});



module.exports = router;