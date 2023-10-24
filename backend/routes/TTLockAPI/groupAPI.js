const express = require('express');
const router = express.Router();
const axios = require('axios');
const { accessTokenStorage } = require('./accessTokenStorage'); 
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';

router.post('/getList', async (req, res) => {
    let { userID } = req.body;
    try {
        let date = Date.now()
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/group/list',
            ttlockData,
            { headers }
        );
        //console.log(ttlockResponse.data)
        if(typeof ttlockResponse === 'object' && ttlockResponse.data.hasOwnProperty('list')){
            res.json(ttlockResponse.data);
        } else {
            res.json({errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg});
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/add', async (req, res) => {
    let { userID, name } = req.body;
    try {
        let date = Date.now()
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            name: name,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/group/add',
            ttlockData,
            { headers }
        );
        //console.log(ttlockResponse.data)
        if(typeof ttlockResponse === 'object' && ttlockResponse.data.hasOwnProperty('groupId')){
            res.json({groupID: ttlockResponse.data.groupId});
        } else {
            res.json({errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg});
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/delete', async (req, res) => {
    let { userID, groupID } = req.body;
    try {
        let date = Date.now()
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            groupId: groupID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/group/delete',
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
router.post('/rename', async (req, res) => {
    let { userID, groupID, newName } = req.body;
    try {
        let date = Date.now()
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            groupId: groupID,
            name: newName,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/group/update',
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
router.post('/setLock', async (req, res) => {
    let { userID, lockID, groupID } = req.body;
    try {
        let date = Date.now()
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockID,
            groupId: groupID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/setGroup',
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

module.exports = router;