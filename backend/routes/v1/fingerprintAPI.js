const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/delete', async(req, res) => {
    let { clientId, accessToken, lockId, fingerprintId, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            fingerprintId: fingerprintId,
            deleteType: 2,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/fingerprint/delete',
            ttlockData, { headers }
        );
        console.log("fingerprintDelete response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/rename', async(req, res) => {
    let { clientId, accessToken, lockId, fingerprintId, fingerprintName, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            fingerprintId: fingerprintId,
            fingerprintName: fingerprintName,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/fingerprint/rename',
            ttlockData, { headers }
        );
        console.log("passcodeEdit response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/changePeriod', async(req, res) => {
    let { clientId, accessToken, lockId, fingerprintId, startDate, endDate, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            fingerprintId: fingerprintId,
            startDate: startDate,
            endDate: endDate,
            changeType: 2,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/fingerprint/changePeriod',
            ttlockData, { headers }
        );
        console.log("fingerprintChangePeriod response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});

module.exports = router;