const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/list', async(req, res) => {
    let { clientId, accessToken, lockAlias, groupId, pageNo, pageSize, date } = req.query;
    console.log("list Request: ", req.query);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !pageNo || !pageSize || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            pageNo,
            pageSize,
            date
        }
        if (lockAlias) ttlockData.lockAlias = lockAlias;
        if (groupId) ttlockData.groupId = groupId;
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/lock/list', { params: ttlockData, headers }
        );
        console.log("lockList Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.get('/listKey', async(req, res) => {
    let { clientId, accessToken, lockId, pageNo, pageSize, date } = req.query;
    console.log("listKey Request: ", req.query);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !pageNo || !pageSize || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            pageNo,
            pageSize,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/lock/listKey', { params: ttlockData, headers }
        );
        console.log("lockListEkeys Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.get('/listKeyboardPwd', async(req, res) => {
    let { clientId, accessToken, lockId, pageNo, pageSize, date } = req.query;
    console.log("listKeyboardPwd Request: ", req.query);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !pageNo || !pageSize || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            pageNo,
            pageSize,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/lock/listKeyboardPwd', { params: ttlockData, headers }
        );
        console.log("listKeyboardPwd Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.get('/listFingerprints', async(req, res) => {
    let { clientId, accessToken, lockId, pageNo, pageSize, date } = req.query;
    console.log("listFingerprints Request: ", req.query);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !pageNo || !pageSize || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            pageNo,
            pageSize,
            orderBy: 0,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/fingerprint/list', { params: ttlockData, headers }
        );
        console.log("listFingerprints Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.get('/listRecord', async(req, res) => {
    let { clientId, accessToken, lockId, startDate, endDate, pageNo, pageSize, recordType, date } = req.query;
    console.log("listRecord Request: ", req.query);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !pageNo || !pageSize || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            pageNo,
            pageSize,
            date,
        };
        // Add optional parameters only if they are provided
        if (startDate) ttlockData.startDate = startDate;
        if (endDate) ttlockData.endDate = endDate;
        if (recordType) ttlockData.recordType = recordType;
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/lockRecord/list', { params: ttlockData, headers }
        );
        console.log("listRecord Response: ", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.get('/detail', async(req, res) => {
    let { clientId, accessToken, lockId, date } = req.query;
    console.log("detail Request: ", req.query);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/lock/detail', { params: ttlockData, headers }
        );
        console.log("detail Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/delete', async(req, res) => {
    let { clientId, accessToken, lockId, date } = req.body;
    console.log("delete Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/delete',
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
    let { clientId, accessToken, lockId, lockAlias, date } = req.body;
    console.log("rename Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            date
        };
        if (lockAlias) ttlockData.lockAlias = lockAlias;
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/rename',
            ttlockData, { headers }
        );
        console.log("rename response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/transfer', async(req, res) => {
    let { clientId, accessToken, receiverUsername, lockIdList, date } = req.body;
    console.log("transfer Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !receiverUsername || !lockIdList || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            receiverUsername,
            lockIdList,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/transfer',
            ttlockData, { headers }
        );
        console.log("transfer response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/setAutoLockTime', async(req, res) => {
    let { clientId, accessToken, lockId, seconds, type, date } = req.body;
    console.log("setAutoLockTime Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !seconds || type || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            seconds,
            type,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/setAutoLockTime',
            ttlockData, { headers }
        );
        console.log("setAutoLockTime Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/unlock', async(req, res) => {
    let { clientId, accessToken, lockId, date } = req.body;
    console.log("unlock Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/unlock',
            ttlockData, { headers }
        );
        console.log("unlock Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/lock', async(req, res) => {
    let { clientId, accessToken, lockId, date } = req.body;
    console.log("lock Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/lock',
            ttlockData, { headers }
        );
        console.log("lock Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.get('/queryOpenState', async(req, res) => {
    let { clientId, accessToken, lockId, date } = req.query;
    console.log("queryOpenState Request: ", req.query);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/lock/queryOpenState', { params: ttlockData, headers }
        );
        console.log("queryOpenState Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.get('/queryDate', async(req, res) => {
    let { clientId, accessToken, lockId, date } = req.query;
    console.log("queryDate Request: ", req.query);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/lock/queryDate', { params: ttlockData, headers }
        );
        console.log("queryDate response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/updateDate', async(req, res) => {
    let { clientId, accessToken, lockId, date } = req.body;
    console.log("updateDate Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/updateDate',
            ttlockData, { headers }
        );
        console.log("updateDate response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.get('/hubs', async(req, res) => {
    let { clientId, accessToken, lockId, date } = req.query;
    console.log("hubs Request: ", req.query);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/gateway/listByLock', { params: ttlockData, headers }
        );
        console.log("hubs response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});

module.exports = router;