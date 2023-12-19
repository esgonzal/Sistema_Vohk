const express = require('express');
const router = express.Router();
const axios = require('axios');
const md5 = require('md5');
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_CLIENT_SECRET = '33b556bdb803763f2e647fc7a357dedf';
const { accessTokenStorage, storeAccessToken } = require('./accessTokenStorage');
/*
router.post('/register', async (req, res) => {
    let { nombre, clave } = req.body;
    try {
        if (!isValidEmail(nombre) && !isValidPhone(nombre).isValid) {
            return res.json({ errcode: 30002, errmsg: 'La cuenta debe ser un correo electrónico o número de celular' });
        }
        let encode = customBase64Encode(nombre);
        let date = Date.now()
        let encryptedPassword = md5(clave);
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            clientSecret: TTLOCK_CLIENT_SECRET,
            username: encode,
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
        //console.log("ttlock response:", ttlockResponse.data)
        if (typeof ttlockResponse === 'object' &&
            ttlockResponse.data.hasOwnProperty('username') &&
            typeof ttlockResponse.data.username === 'string'
        ) {// Registration was successful
            //Agregar a base de datos
            if (isValidEmail(nombre)) {
                let userData = {
                    accountName: encodeNombre(nombre),
                    originalUsername: nombre,
                    nickname: nombre,
                    email: nombre,
                    phone: '',
                    password: clave
                }
                let headers = {
                    'Content-Type': 'application/json'
                }
                let DBResponse = await axios.post(
                    URL.concat('/DB/usuarios/create'),
                    userData,
                    { headers }
                );
                console.log("DBResponse:", DBResponse.data)
            } else if (isValidPhone(nombre).isValid) {
                let userData = {
                    accountName: encodeNombre(nombre),
                    originalUsername: nombre,
                    nickname: nombre,
                    email: '',
                    phone: nombre,
                    password: clave
                }
                let headers = {
                    'Content-Type': 'application/json'
                }
                let DBResponse = await axios.post(
                    URL.concat('/DB/usuarios/create'),
                    userData,
                    { headers }
                );
                console.log("DBResponse:", DBResponse.data)
            }
            res.json({ errcode: 0, errmsg: 'Usuario registrado' });
        } else if (typeof ttlockResponse === 'object' &&
            ttlockResponse.data.hasOwnProperty('description') &&
            typeof ttlockResponse.data.description === 'string' &&
            ttlockResponse.data.hasOwnProperty('errcode') &&
            typeof ttlockResponse.data.errcode === 'number' &&
            ttlockResponse.data.hasOwnProperty('errmsg') &&
            typeof ttlockResponse.data.errmsg === 'string'
        ) {// Registration was unsuccessful
            res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
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
            username: encodeNombre(nombre),
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
        if (typeof ttlockResponse === 'object' && ttlockResponse.data.hasOwnProperty("errcode")) {
            if (ttlockResponse.data.errcode === 0) {
                let passwordChangeData = {
                    accountName: encodeNombre(nombre),
                    password: clave
                };
                let headers = {
                    'Content-Type': 'application/json'
                };
                let DBResponse = await axios.put(
                    URL.concat('/DB/usuarios/password'),
                    passwordChangeData,
                    { headers }
                );
                console.log("DBResponse:", DBResponse.data)
            }
        }
        //console.log(ttlockResponse.data)
        res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
*/
router.post('/login', async (req, res) => {
    let { nombre, clave } = req.body;
    try {
        let encryptedPassword = md5(clave);
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            clientSecret: TTLOCK_CLIENT_SECRET,
            username: nombre,
            password: clave
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/oauth2/token',
            ttlockData,
            { headers }
        );
        //console.log(ttlockResponse)
        if (ttlockResponse.data.access_token) {
            storeAccessToken(nombre, ttlockResponse.data.access_token);
            console.log(accessTokenStorage)
            res.json({ errcode: 0, userID: nombre });
        } else {
            res.json(ttlockResponse.data);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/logout', async (req, res) => {
    try {
        const { userID } = req.body;
        if (accessTokenStorage.hasOwnProperty(userID)) {
            delete accessTokenStorage[userID];
            res.json({ errmsg: 'Success' });
            console.log(accessTokenStorage)
        } else {
            res.json({ errmsg: 'Fail' });
        }
    } catch (error) {
        console.error(error);
        res.json({ errmsg: 'Error with API' });
    }
});

module.exports = router;
