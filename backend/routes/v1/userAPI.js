const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/register', async (req, res) => {
    let { clientId, clientSecret, username, password, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            clientSecret: clientSecret,
            username: username,
            password: password,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/user/register',
            ttlockData,
            { headers }
        );
        //console.log("ttlock response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/resetPassword', async (req, res) => {
    let { clientId, clientSecret, username, password, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            clientSecret: clientSecret,
            username: username,
            password: password,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/user/resetPassword',
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
router.get('/list', async (req, res) => {
    let { clientId, clientSecret, startDate, endDate, pageNo, pageSize, date } = req.query;
    try {
        let ttlockData = {
            clientId: clientId,
            clientSecret: clientSecret,
            startDate: startDate,
            endDate: endDate,
            pageNo: pageNo,
            pageSize: pageSize,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/user/list',
            { params: ttlockData, headers }
        );
        //console.log(ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/delete', async (req, res) => {
    let { clientId, clientSecret, username, date } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            clientSecret: clientSecret,
            username: username,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/user/delete',
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
router.post('/token', async (req, res) => {
    let { clientId, clientSecret, username, password } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            clientSecret: clientSecret,
            username: username,
            password: password
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/oauth2/token',
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
router.post('/refreshToken', async (req, res) => {
    let { clientId, clientSecret, grant_type, refresh_token } = req.body;
    try {
        let ttlockData = {
            clientId: clientId,
            clientSecret: clientSecret,
            grant_type: grant_type,
            refresh_token: refresh_token
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/oauth2/token',
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
