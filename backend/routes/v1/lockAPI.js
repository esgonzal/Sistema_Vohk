const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/list', async (req, res) => {
    let { clientId, accessToken, lockAlias, groupId, pageNo, pageSize, date } = req.query;
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
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/lock/list',
            { params: ttlockData, headers }
        );
        console.log("lockList response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.get('/listKey', async (req, res) => {
    let { clientId, accessToken, lockId, pageNo, pageSize, date } = req.query;
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
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/lock/listKey',
            { params: ttlockData, headers }
        );
        console.log("lockListEkeys response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.get('/listKeyboardPwd', async (req, res) => {
    let { clientId, accessToken, lockId, pageNo, pageSize, date } = req.query;
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
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/lock/listKeyboardPwd',
            { params: ttlockData, headers }
        );
        console.log("lockListPasscodes response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.get('/detail', async (req, res) => {
    let { clientId, accessToken, lockId, date } = req.query;
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
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/lock/detail',
            { params: ttlockData, headers }
        );
        console.log("lockDetail response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
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
        console.log("lockDelete response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
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
        console.log("lockRename response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
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
        console.log("lockTransfer response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
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
        console.log("lockSetAutoLockTime response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
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
        console.log("lockUnlock response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
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
        console.log("lockLock response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.get('/queryOpenState', async (req, res) => {
    let { clientId, accessToken, lockId, date } = req.query;
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
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/lock/queryOpenState',
            { params: ttlockData, headers }
        );
        console.log("lockQueryOpenState response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.get('/queryDate', async (req, res) => {
    let { clientId, accessToken, lockId, date } = req.query;
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
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/lock/queryDate',
            { params: ttlockData, headers }
        );
        console.log("lockQueryDate response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
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
        console.log("lockUpdateDate response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});

module.exports = router;