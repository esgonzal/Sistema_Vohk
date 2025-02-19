const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/register', async(req, res) => {
    let { clientId, clientSecret, username, password, date } = req.body;
    console.log("register Request: Censored");
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !clientSecret || !username || !password || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            clientSecret,
            username,
            password,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/user/register',
            ttlockData, { headers }
        );
        console.log("register Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.get('/list', async(req, res) => {
    let { clientId, clientSecret, startDate, endDate, pageNo, pageSize, date } = req.query;
    console.log("list Request: ", req.query);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !clientSecret || !pageNo || !pageSize || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            clientSecret,
            pageNo,
            pageSize,
            date
        };
        if (startDate) ttlockData.startDate = startDate;
        if (endDate) ttlockData.endDate = endDate;
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/user/list', { params: ttlockData, headers }
        );
        console.log("list Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/resetPassword', async(req, res) => {
    let { clientId, clientSecret, username, password, date } = req.body;
    console.log("resetPassword Request: Censored");
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !clientSecret || !username || !password || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            clientSecret,
            username,
            password,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/user/resetPassword',
            ttlockData, { headers }
        );
        console.log("resetPassword Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/delete', async(req, res) => {
    let { clientId, clientSecret, username, date } = req.body;
    console.log("delete Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !clientSecret || !username || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            clientSecret,
            username,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/user/delete',
            ttlockData, { headers }
        );
        console.log("delete Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/token', async(req, res) => {
    let { clientId, clientSecret, username, password } = req.body;
    console.log("token Request: Censored");
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !clientSecret || !username || !password) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            clientSecret,
            username,
            password
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/oauth2/token',
            ttlockData, { headers }
        );
        console.log("token Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/refreshToken', async(req, res) => {
    let { clientId, clientSecret, grant_type, refresh_token } = req.body;
    console.log("refreshToken Request: Censored");
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !clientSecret || !grant_type || !refresh_token) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            clientSecret,
            grant_type,
            refresh_token
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/oauth2/token',
            ttlockData, { headers }
        );
        console.log("refreshToken response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});

module.exports = router;