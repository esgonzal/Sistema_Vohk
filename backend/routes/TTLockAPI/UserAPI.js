const express = require('express');
const router = express.Router();
const axios = require('axios');
const md5 = require('md5');
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_CLIENT_SECRET = '33b556bdb803763f2e647fc7a357dedf';
const { accessTokenStorage, storeAccessToken } = require('./accessTokenStorage');

router.post('/register', async (req, res) => {
    let { nombre, clave } = req.body;
    try {
        let date = Date.now()
        let encryptedPassword = md5(clave);
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            clientSecret: TTLOCK_CLIENT_SECRET,
            username: nombre,
            password: encryptedPassword,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/user/register',
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
router.post('/login', async (req, res) => {
    let { nombre, clave } = req.body;
    try {
        let encryptedPassword = md5(clave);
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            clientSecret: TTLOCK_CLIENT_SECRET,
            username: nombre,
            password: encryptedPassword
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
        if (ttlockResponse.data.access_token) {
            storeAccessToken(nombre, ttlockResponse.data.access_token);
            //console.log(accessTokenStorage)
            res.json({ errcode: 'Success' });
        } else {
            res.json({ errcode: 'Fail' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error with TTLock API' });
    }
});
router.post('/resetPassword', async (req, res) => {
    let { nombre, clave } = req.body;
    try {
        let date = Date.now()
        let encryptedPassword = md5(clave);
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            clientSecret: TTLOCK_CLIENT_SECRET,
            username: nombre,
            password: encryptedPassword,
            date,
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
        res.status(500).json({ error: 'Error with TTLock API' });
    }
});
router.post('/logout', async (req, res) => {
    try {
        const { userID } = req.body;
        if (accessTokenStorage.hasOwnProperty(userID)) {
            delete accessTokenStorage[userID];
            res.json({ message: 'Success' });
            //console.log(accessTokenStorage)
        } else {
            res.json({ message: 'Fail' });
        }
    } catch (error) {
        console.error(error);
        res.json({ error: 'Error with API' });
    }
});

module.exports = router;
