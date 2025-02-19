const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/add', async(req, res) => {
    let { clientId, accessToken, name, date } = req.body;
    console.log("add Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !name || !date) {
        console.log("errmsg: Missing required parameters");
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            name,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/group/add',
            ttlockData, { headers }
        );
        console.log("add Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.get('/list', async(req, res) => {
    let { clientId, accessToken, date } = req.query;
    console.log("list Request: ", req.query);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !date) {
        console.log("errmsg: Missing required parameters");
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            orderBy: 0,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/group/list', { params: ttlockData, headers }
        );
        console.log("list Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/setLock', async(req, res) => {
    let { clientId, accessToken, lockId, groupId, date } = req.body;
    console.log("setLock Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !groupId || !date) {
        console.log("errmsg: Missing required parameters");
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            groupId,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/setGroup',
            ttlockData, { headers }
        );
        console.log("setLock Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/delete', async(req, res) => {
    let { clientId, accessToken, groupId, date } = req.body;
    console.log("delete Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !groupId || !date) {
        console.log("errmsg: Missing required parameters");
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            groupId,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/group/delete',
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
    let { clientId, accessToken, groupId, name, date } = req.body;
    console.log("rename Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !groupId || !name || !date) {
        console.log("errmsg: Missing required parameters");
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            groupId,
            name,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/group/update',
            ttlockData, { headers }
        );
        console.log("rename Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});

module.exports = router;