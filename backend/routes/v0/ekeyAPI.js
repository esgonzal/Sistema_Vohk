const express = require('express');
const router = express.Router();
const axios = require('axios');
const moment = require('moment-timezone');
const md5 = require('md5');
const { accessTokenStorage } = require('./accessTokenStorage');
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_CLIENT_SECRET = '33b556bdb803763f2e647fc7a357dedf';
const URL = 'https://api.vohkapp.com';
//const URL = 'http://localhost:8080';

router.post('/send', async(req, res) => {
    let { userID, lockID, recieverName, keyName, startDate, endDate, remoteEnable, keyRight, keyType, startDay, endDay, weekDays } = req.body;
    try {
        let date = Date.now()
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockID,
            receiverUsername: recieverName,
            keyName: keyName,
            startDate: startDate,
            endDate: endDate,
            remoteEnable: remoteEnable,
            keyRight: keyRight,
            createUser: 1,
            keyType: keyType,
            startDay: startDay,
            endDay: endDay,
            weekDays: weekDays,
            date: date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/send',
            ttlockData, { headers }
        );
        //console.log(ttlockResponse.data)
        if (typeof ttlockResponse === 'object' &&
            ttlockResponse.data.hasOwnProperty('keyId') &&
            typeof ttlockResponse.data.keyId === 'number') { //Send ekey was successful
            //console.log(checkAccountResponse.data)
            res.json({ keyId: ttlockResponse.data.keyId })
        } else { //Send ekey was unsuccessful
            res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg })
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});

router.post('/generateEmail', async(req, res) => {
    let { userID, lockAlias, recieverName, startDate, endDate, email } = req.body;
    try {
        let emailResponse;
        let toEmail;
        // Check if receiverName is email or phone
        const isEmail = isValidEmail(recieverName);
        const phone_pass = getLastSixDigits(recieverName);
        // Check if the account is new or old
        const isNewAccount = await checkIfNewAccount(recieverName); // Define this function based on your business logic
        if (isEmail && isNewAccount) { //EMAIL NUEVO
            toEmail = recieverName;
            if (endDate === '0') { //Permanent
                let emailBody = { toEmail: recieverName, to: recieverName, from: userID, lock_alias: lockAlias, password: "il.com" };
                emailResponse = await axios.post(URL.concat('/mail/eKeyPermanentNewUser'), emailBody)
            } else { // Periodic
                let startDate_string = moment(Number(startDate)).tz('America/Santiago').format("DD/MM/YYYY HH:mm");
                let endDate_string = moment(Number(endDate)).tz('America/Santiago').format("DD/MM/YYYY HH:mm");
                let body = { toEmail: recieverName, to: recieverName, from: userID, lock_alias: lockAlias, password: "il.com", start: startDate_string, end: endDate_string };
                emailResponse = await axios.post(URL.concat('/mail/eKeyPeriodicNewUser'), body)
            }
        } else if (!isEmail && isNewAccount) { //TELEFONO NUEVO
            toEmail = email;
            if (endDate === '0') { //Permanent
                let body = { toEmail: email, to: recieverName, from: userID, lock_alias: lockAlias, password: phone_pass };
                emailResponse = await axios.post(URL.concat('/mail/eKeyPermanentNewUser'), body)
            } else { // Periodic
                let startDate_string = moment(Number(startDate)).tz('America/Santiago').format("DD/MM/YYYY HH:mm");
                let endDate_string = moment(Number(endDate)).tz('America/Santiago').format("DD/MM/YYYY HH:mm");
                let body = { toEmail: email, to: recieverName, from: userID, lock_alias: lockAlias, password: phone_pass, start: startDate_string, end: endDate_string };
                emailResponse = await axios.post(URL.concat('/mail/eKeyPeriodicNewUser'), body)
            }
        } else if (isEmail && !isNewAccount) { //EMAIL ANTIGUO
            toEmail = recieverName;
            if (endDate === '0') { //Permanent
                let emailBody = { toEmail: recieverName, to: recieverName, from: userID, lock_alias: lockAlias };
                emailResponse = await axios.post(URL.concat('/mail/ekeyPermanent'), emailBody)
            } else { // Periodic
                let startDate_string = moment(Number(startDate)).tz('America/Santiago').format("DD/MM/YYYY HH:mm");
                let endDate_string = moment(Number(endDate)).tz('America/Santiago').format("DD/MM/YYYY HH:mm");
                let body = { toEmail: recieverName, to: recieverName, from: userID, lock_alias: lockAlias, start: startDate_string, end: endDate_string };
                emailResponse = await axios.post(URL.concat('/mail/eKeyPeriodic'), body)
            }
        } else { //TELEFONO ANTIGUO
            toEmail = email;
            if (endDate === '0') { //Permanent
                let body = { toEmail: email, to: recieverName, from: userID, lock_alias: lockAlias };
                emailResponse = await axios.post(URL.concat('/mail/ekeyPermanent'), body)
            } else { // Periodic
                let startDate_string = moment(Number(startDate)).tz('America/Santiago').format("DD/MM/YYYY HH:mm");
                let endDate_string = moment(Number(endDate)).tz('America/Santiago').format("DD/MM/YYYY HH:mm");
                let body = { toEmail: email, to: recieverName, from: userID, lock_alias: lockAlias, start: startDate_string, end: endDate_string };
                emailResponse = await axios.post(URL.concat('/mail/eKeyPeriodic'), body)
            }
        }
        res.json({ emailContent: emailResponse.data.emailContent, toEmail: toEmail });
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with sending email' });
    }
});

router.post('/list', async(req, res) => {
    let { userID, pageNo, pageSize, groupID } = req.body;
    try {
        let date = Date.now()
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            pageNo: pageNo,
            pageSize: pageSize,
            groupId: groupID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/key/list', { params: ttlockData, headers }
        );
        //console.log(ttlockResponse.data)
        if (typeof ttlockResponse === 'object' && ttlockResponse.data.hasOwnProperty('list')) {
            res.json(ttlockResponse.data);
        } else {
            res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/delete', async(req, res) => {
    let { userID, keyID } = req.body;
    try {
        let date = Date.now()
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            keyId: keyID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/delete',
            ttlockData, { headers }
        );
        res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/freeze', async(req, res) => {
    let { userID, keyID } = req.body;
    try {
        let date = Date.now()
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            keyId: keyID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/freeze',
            ttlockData, { headers }
        );
        //console.log(ttlockResponse.data)
        res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/unfreeze', async(req, res) => {
    let { userID, keyID } = req.body;
    try {
        let date = Date.now()
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            keyId: keyID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/unfreeze',
            ttlockData, { headers }
        );
        //console.log(ttlockResponse.data)
        res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/modify', async(req, res) => {
    let { userID, keyID, newName, remoteEnable } = req.body;
    try {
        let date = Date.now()
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            keyId: keyID,
            keyName: newName,
            remoteEnable: remoteEnable,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/update',
            ttlockData, { headers }
        );
        res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/changePeriod', async(req, res) => {
    let { userID, keyID, newStartDate, newEndDate } = req.body;
    try {
        let date = Date.now()
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            keyId: keyID,
            startDate: newStartDate,
            endDate: newEndDate,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/changePeriod',
            ttlockData, { headers }
        );
        //console.log(ttlockResponse.data)
        res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/authorize', async(req, res) => {
    let { userID, lockID, keyID } = req.body;
    try {
        let date = Date.now()
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockID,
            keyId: keyID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/authorize',
            ttlockData, { headers }
        );
        //console.log(ttlockResponse.data)
        res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/unauthorize', async(req, res) => {
    let { userID, lockID, keyID } = req.body;
    try {
        let date = Date.now()
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockID,
            keyId: keyID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/unauthorize',
            ttlockData, { headers }
        );
        //console.log(ttlockResponse.data)
        res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/getListLock', async(req, res) => {
    let { userID, lockID, pageNo, pageSize } = req.body;
    try {
        let date = Date.now()
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockID,
            pageNo: pageNo,
            pageSize: pageSize,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/lock/listKey', { params: ttlockData, headers }
        );
        //console.log(ttlockResponse.data)
        if (typeof ttlockResponse === 'object' && ttlockResponse.data.hasOwnProperty('list')) {
            res.json(ttlockResponse.data);
        } else {
            res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});

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

function getLastSixDigits(phoneNumber) {
    const numericPart = phoneNumber.replace(/\D/g, '');
    const lastSixDigits = numericPart.slice(-6);
    return lastSixDigits;
}
async function checkIfNewAccount(username) {
    const phonePass = getLastSixDigits(username);
    const checkAccountData = {
        clientId: TTLOCK_CLIENT_ID,
        clientSecret: TTLOCK_CLIENT_SECRET,
        username: username,
        password: md5(phonePass)
    };
    const checkAccountHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };
    const checkAccountResponse = await axios.post(
        'https://euapi.ttlock.com/oauth2/token',
        checkAccountData, { headers: checkAccountHeaders }
    );
    if (checkAccountResponse.data.hasOwnProperty('access_token')) {
        return true;
    } else {
        return false;
    }
}
module.exports = router;