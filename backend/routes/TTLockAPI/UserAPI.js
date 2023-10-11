const express = require('express');
const router = express.Router();
const axios = require('axios');
const md5 = require('md5');
const libphonenumber = require('google-libphonenumber');
const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_CLIENT_SECRET = '33b556bdb803763f2e647fc7a357dedf';
const { accessTokenStorage, storeAccessToken } = require('./accessTokenStorage');

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
                    'http://localhost:3000/api/DB/usuarios/create',
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
                await axios.post(
                    'http://localhost:3000/api/usuarios/create',
                    userData,
                    { headers }
                );
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
        res.status(500).json({ error: 'Error with TTLock API' });
    }
});
router.post('/login', async (req, res) => {
    let { nombre, clave } = req.body;
    try {
        const userExistsResponse = await axios.get(`http://localhost:3000/api/DB/usuarios/exists/${encodeNombre(nombre)}`);
        if (typeof userExistsResponse === 'object' && userExistsResponse.data.hasOwnProperty('exists')) {
            if (userExistsResponse.data.exists) {
                console.log("Se mete si existe en la base de datos")
                const UserInDBResponse = await axios.get(`http://localhost:3000/api/DB/usuarios/${encodeNombre(nombre)}`);
                if (typeof UserInDBResponse === 'object' && UserInDBResponse.data.hasOwnProperty('nickname') && UserInDBResponse.data.hasOwnProperty('accountname')) {
                    let encryptedPassword = md5(clave);
                    let ttlockData = {
                        clientId: TTLOCK_CLIENT_ID,
                        clientSecret: TTLOCK_CLIENT_SECRET,
                        username: UserInDBResponse.data.accountname,
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
                    //console.log(ttlockResponse)
                    if (ttlockResponse.data.access_token) {
                        storeAccessToken(UserInDBResponse.data.accountname, ttlockResponse.data.access_token);
                        console.log(accessTokenStorage)
                        res.json({ errcode: 'Success', account: 'Vohk', nickname: UserInDBResponse.data.nickname, userID: UserInDBResponse.data.accountname });
                    } else {
                        res.json(ttlockResponse.data);
                    }
                }
            } else {//The user doesnt exists in the database(Its a TTLock account)
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
                    console.log(accessTokenStorage)
                    res.json({ errcode: 'Success', userID: nombre });
                } else {
                    res.json(ttlockResponse.data);
                }
            }
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
                    'http://localhost:3000/api/DB/usuarios/password',
                    passwordChangeData,
                    { headers }
                );
            }
        }
        //console.log(ttlockResponse.data)
        res.json({errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg});
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
            console.log(accessTokenStorage)
        } else {
            res.json({ message: 'Fail' });
        }
    } catch (error) {
        console.error(error);
        res.json({ error: 'Error with API' });
    }
});

function customBase64Encode(input) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let output = '';
    let padding = 0;
    let position = 0;
    for (let i = 0; i < input.length; i++) {
        padding = (padding << 8) | input.charCodeAt(i);
        position += 8;

        while (position >= 6) {
            const index = (padding >> (position - 6)) & 0x3f;
            output += chars.charAt(index);
            position -= 6;
        }
    }
    if (position > 0) {
        const index = (padding << (6 - position)) & 0x3f;
        output += chars.charAt(index);
    }
    return output;
}
function encodeNombre(username) {
    let prefijo = 'bhaaa_';
    return prefijo.concat(customBase64Encode(username));
}
function customBase64Decode(encoded) {
    const base64Chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const base64Lookup = {};
    for (let i = 0; i < base64Chars.length; i++) {
        base64Lookup[base64Chars.charAt(i)] = i;
    }
    let decoded = '';
    let buffer = 0;
    let numBits = 0;
    for (let i = 0; i < encoded.length; i++) {
        const char = encoded.charAt(i);
        const value = base64Lookup[char];
        if (value === undefined) {
            // Invalid character in the encoded string
            throw new Error('Invalid character in encoded string');
        }
        buffer = (buffer << 6) | value;
        numBits += 6;
        if (numBits >= 8) {
            decoded += String.fromCharCode((buffer >> (numBits - 8)) & 0xff);
            buffer &= (1 << (numBits - 8)) - 1;
            numBits -= 8;
        }
    }
    return decoded;
}
function decodeNombre(username) {
    if (username) {
        let nombre_dividido = username.split("_");
        if (nombre_dividido[0] === 'bhaaa') {
            return customBase64Decode(nombre_dividido[1]);
        } else {
            return username;
        }
    } else {
        return username;
    }
}
function isValidEmail(email) {
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return emailPattern.test(email);
}
function isValidPhone(phone) {
    try {
        const phoneNumber = phoneUtil.parseAndKeepRawInput(phone, 'US'); // You can specify the default country code here
        if (phoneUtil.isValidNumber(phoneNumber)) {
            const country = phoneUtil.getRegionCodeForNumber(phoneNumber);
            return { isValid: true, country };
        } else {
            return { isValid: false };
        }
    } catch (error) {
        return { isValid: false };
    }
}

module.exports = router;
