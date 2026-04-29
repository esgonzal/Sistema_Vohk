const express = require('express');
const router = express.Router();
const axios = require('axios');
const moment = require('moment-timezone');
const md5 = require('md5');
const { accessTokenStorage } = require('./accessTokenStorage');
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_CLIENT_SECRET = '33b556bdb803763f2e647fc7a357dedf';
const URL = 'https://api.vohk.cl';
//const URL = 'http://localhost:8080';
const TTLOCK_BASE_URL = 'https://euapi.ttlock.com/v3';
const { getAccessTokenOrFail, buildHeaders } = require('../../utils/ttlock');
const ekeyController = require('../../controllers/v0/ekeyController');

router.post('/getListLock', ekeyController.getLockEkeyList);
router.post('/delete', ekeyController.deleteEkey);
router.post('/modify', ekeyController.modify);
router.post('/changePeriod', ekeyController.changePeriod);
router.post('/freeze', ekeyController.freeze);
router.post('/unfreeze', ekeyController.unfreeze);
router.post('/authorize', ekeyController.auth);
router.post('/unauthorize', ekeyController.unauth);
router.post('/list', ekeyController.getEkeyListAccount);
router.post('/send', ekeyController.send);

router.post('/send2', async (req, res) => {
    let { userID, selectedLocks, recieverName, keyName, startDate, endDate, remoteEnable, keyRight } = req.body;
    try {
        let date = Date.now()
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        const locksResults = [];
        for (const lock of selectedLocks) {
            try {
                let ttlockData = {
                    clientId: TTLOCK_CLIENT_ID,
                    accessToken: accessToken,
                    lockId: lock.id,
                    receiverUsername: recieverName,
                    keyName: keyName,
                    startDate: startDate,
                    endDate: endDate,
                    remoteEnable: remoteEnable,
                    keyRight: keyRight,
                    createUser: 1,
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
                if (typeof ttlockResponse === 'object' &&
                    ttlockResponse.data.hasOwnProperty('keyId') &&
                    typeof ttlockResponse.data.keyId === 'number') { //Send ekey was successful
                    locksResults.push({
                        lockID: lock.id,
                        lockAlias: lock.alias,
                        success: true
                    })
                } else { //Send ekey was unsuccessful
                    locksResults.push({
                        lockID: lock.id,
                        lockAlias: lock.alias,
                        errcode: ttlockResponse.data.errcode,
                        success: false
                    })
                }
            } catch (lockError) {
                console.error(lockError);
                locksResults.push({
                    lockID: lock.id,
                    lockAlias: lock.alias,
                    errcode: lockError.message || 'Error calling TTLock API'
                });
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/generateEmail', async (req, res) => {
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
    const lastSixChars = phoneNumber.slice(-6);
    return lastSixChars;
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
        //console.log("Cuenta nueva");
        return true;
    } else {
        return false;
    }
}
module.exports = router;