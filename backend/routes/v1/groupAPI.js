const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/add', async(req, res) => {
    let { clientId, accessToken, name, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            name: name,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/group/add',
            ttlockData, { headers }
        );
        console.log("groupAdd response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.get('/list', async(req, res) => {
    let { clientId, accessToken, date } = req.query;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/group/list', { params: ttlockData, headers }
        );
        console.log("groupList response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/setLock', async(req, res) => {
    let { clientId, accessToken, lockId, groupId, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            groupId: groupId,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/setGroup',
            ttlockData, { headers }
        );
        console.log("groupSetGroup response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/delete', async(req, res) => {
    let { clientId, accessToken, groupId, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            groupId: groupId,
            date: date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/group/delete',
            ttlockData, { headers }
        );
        console.log("groupDelete response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/rename', async(req, res) => {
    let { clientId, accessToken, groupId, name, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            groupId: groupId,
            name: name,
            date: date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/group/update',
            ttlockData, { headers }
        );
        console.log("groupUpdate response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});

module.exports = router;