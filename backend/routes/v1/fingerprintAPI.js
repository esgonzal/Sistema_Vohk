const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/delete', async(req, res) => {
    let { clientId, accessToken, lockId, fingerprintId, deleteType, date } = req.body;
    console.log("delete Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !fingerprintId || !deleteType || !date) {
        console.log("errmsg: Missing required parameters");
        return res.status(400).json({
            errmsg: "Missing required parameters",
            missingParams: [
                !clientId && "clientId",
                !accessToken && "accessToken",
                !lockId && "lockId",
                !fingerprintId && "fingerprintId",
                !deleteType && "deleteType",
                !date && "date"
            ].filter(Boolean)
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            fingerprintId,
            deleteType,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/fingerprint/delete',
            ttlockData, { headers }
        );
        console.log("delete Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/rename', async(req, res) => {
    let { clientId, accessToken, lockId, fingerprintId, fingerprintName, date } = req.body;
    console.log("rename Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !fingerprintId || !fingerprintName || !date) {
        console.log("errmsg: Missing required parameters");
        return res.status(400).json({
            errmsg: "Missing required parameters",
            missingParams: [
                !clientId && "clientId",
                !accessToken && "accessToken",
                !lockId && "lockId",
                !fingerprintId && "fingerprintId",
                !fingerprintName && "fingerprintName",
                !date && "date"
            ].filter(Boolean)
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            fingerprintId,
            date
        };
        if (fingerprintName) ttlockData.fingerprintName = fingerprintName;
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/fingerprint/rename',
            ttlockData, { headers }
        );
        console.log("rename Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/changePeriod', async(req, res) => {
    let { clientId, accessToken, lockId, fingerprintId, startDate, endDate, date } = req.body;
    console.log("changePeriod Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !fingerprintId || !startDate || !endDate || !date) {
        console.log("errmsg: Missing required parameters");
        return res.status(400).json({
            errmsg: "Missing required parameters",
            missingParams: [
                !clientId && "clientId",
                !accessToken && "accessToken",
                !lockId && "lockId",
                !fingerprintId && "fingerprintId",
                !startDate && "startDate",
                !endDate && "endDate",
                !date && "date"
            ].filter(Boolean)
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            fingerprintId,
            startDate,
            endDate,
            changeType: 2,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/fingerprint/changePeriod',
            ttlockData, { headers }
        );
        console.log("changePeriod Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});

module.exports = router;