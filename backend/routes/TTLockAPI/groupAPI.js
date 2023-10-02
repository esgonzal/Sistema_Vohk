const express = require('express');
const router = express.Router();
const axios = require('axios');

// Constants for clientId and clientSecret
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';

router.post('/getList', async (req, res) => {
    let { token } = req.body;
    try {
        let date = Date.now()
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: token,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/group/list',
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
    let { token, name } = req.body;
    try {
        let date = Date.now()
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: token,
            name: name,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/group/add',
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
    let { token, groupID } = req.body;
    try {
        let date = Date.now()
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: token,
            groupId: groupID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/group/delete',
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
router.post('/rename', async (req, res) => {
    let { token, groupID, newName } = req.body;
    try {
        let date = Date.now()
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: token,
            groupId: groupID,
            name: newName,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/group/update',
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
router.post('/setLock', async (req, res) => {
    let { token, lockID, groupID } = req.body;
    try {
        let date = Date.now()
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: token,
            lockId: lockID,
            groupId: groupID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/setGroup',
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