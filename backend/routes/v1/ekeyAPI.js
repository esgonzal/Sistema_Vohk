const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/send', async (req, res) => {
    let { clientId, accessToken, lockId, receiverUsername, keyName, startDate, endDate, remarks, remoteEnable, keyRight, createUser, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            receiverUsername: receiverUsername,
            keyName: keyName,
            startDate: startDate,
            endDate: endDate,
            remarks: remarks,
            remoteEnable: remoteEnable,
            keyRight: keyRight,
            createUser: createUser,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/send',
            ttlockData,
            { headers }
        );
        //console.log(ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
})
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
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/list',
            ttlockData,
            { headers }
        );
        //console.log(ttlockResponse.data);
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/delete', async (req, res) => {
    let { clientId, accessToken, keyId, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            keyId: keyId,
            date: date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/delete',
            ttlockData,
            { headers }
        );
        //console.log(ttlockResponse.data);
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/freeze', async (req, res) => {
    let { clientId, accessToken, keyId, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            keyId: keyId,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/freeze',
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
router.post('/unfreeze', async (req, res) => {
    let { clientId, accessToken, keyId, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            keyId: keyId,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/unfreeze',
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
router.post('/modify', async (req, res) => {
    let { clientId, accessToken, keyId, keyName, remoteEnable, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            keyId: keyId,
            keyName: keyName,
            remoteEnable: remoteEnable,
            date: date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/update',
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
router.post('/changePeriod', async (req, res) => {
    let { clientId, accessToken, keyId, startDate, endDate, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            keyId: keyId,
            startDate: startDate,
            endDate: endDate,
            date: date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/changePeriod',
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
router.post('/authorize', async (req, res) => {
    let { clientId, accessToken, lockId, keyId, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            keyId: keyId,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/authorize',
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
router.post('/unauthorize', async (req, res) => {
    let { clientId, accessToken, lockId, keyId, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            keyId: keyId,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/unauthorize',
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