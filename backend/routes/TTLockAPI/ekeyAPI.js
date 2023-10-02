const express = require('express');
const router = express.Router();
const axios = require('axios');

// Constants for clientId and clientSecret
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';

const ttlockAccessTokenMiddleware = (req, res, next) => {
    if (req.path.startsWith('/api/ttlock/')) {
        console.log(req.cookies)
        req.accessToken = req.cookies.access_token || null;
    }
    next();
};

// Apply the middleware to this router
router.use(ttlockAccessTokenMiddleware);

router.post('/getListAccount', async (req, res) => {
    let { token, pageNo, pageSize, groupId } = req.body;
    try {
        let date = Date.now()
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: token,
            pageNo: pageNo,
            pageSize: pageSize,
            groupId: groupId,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        console.log('Request Payload:', ttlockData);
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/list',
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
router.post('/getListLock', async (req, res) => {
    let { token, lockID, pageNo, pageSize } = req.body;
    try {
        let date = Date.now()
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: token,
            lockId: lockID,
            pageNo: pageNo,
            pageSize: pageSize,
            date,
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
        res.status(500).json({ error: 'Error with TTLock API' });
    }
});
router.post('/send', async (req, res) => {
    let { token, lockID, recieverName, keyName, startDate, endDate, keyRight, keyType, startDay, endDay, weekDays } = req.body;
    try {
        let date = Date.now()
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: token,
            lockId: lockID,
            receiverUsername: recieverName,
            keyName: keyName,
            startDate: startDate,
            endDate: endDate,
            keyRight: keyRight,
            keyType: keyType,
            startDay: startDay,
            endDay: endDay,
            weekDays: weekDays,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
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
        res.status(500).json({ error: 'Error with TTLock API' });
    }
})
router.post('/delete', async (req, res) => {
    let { token, keyID } = req.body;
    try {
        let date = Date.now()
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: token,
            keyId: keyID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/delete',
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
router.post('/freeze', async (req, res) => {
    let { token, keyID } = req.body;
    try {
        let date = Date.now()
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: token,
            keyId: keyID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
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
        res.status(500).json({ error: 'Error with TTLock API' });
    }
});
router.post('/unfreeze', async (req, res) => {
    let { token, keyID } = req.body;
    try {
        let date = Date.now()
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: token,
            keyId: keyID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/unfreeze',
            ttlockData,
            { headers }
        );
        console.log(ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error with TTLock API' });
    }
});
router.post('/modify', async (req, res) => {
    let { token, keyID, newName, remoteEnable } = req.body;
    try {
        let date = Date.now()
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: token,
            keyId: keyID,
            keyName: newName,
            remoteEnable: remoteEnable,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
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
        res.status(500).json({ error: 'Error with TTLock API' });
    }
});
router.post('/changePeriod', async (req, res) => {
    let { token, keyID, newStartDate, newEndDate } = req.body;
    try {
        let date = Date.now()
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: token,
            keyId: keyID,
            startDate: newStartDate,
            endDate: newEndDate,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
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
        res.status(500).json({ error: 'Error with TTLock API' });
    }
});
router.post('/authorize', async (req, res) => {
    let { token, lockID, keyID } = req.body;
    try {
        let date = Date.now()
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: token,
            lockId: lockID,
            keyId: keyID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
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
        res.status(500).json({ error: 'Error with TTLock API' });
    }
});
router.post('/unauthorize', async (req, res) => {
    let { token, lockID, keyID } = req.body;
    try {
        let date = Date.now()
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: token,
            lockId: lockID,
            keyId: keyID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
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
        res.status(500).json({ error: 'Error with TTLock API' });
    }
});
// Export the TTLock router
module.exports = router;
