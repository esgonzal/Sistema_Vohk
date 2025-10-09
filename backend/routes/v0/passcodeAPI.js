const express = require('express');
const router = express.Router();
const axios = require('axios');
const { accessTokenStorage } = require('./accessTokenStorage');
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const URL = 'https://api.vohk.cl';
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const USER = "soporte@vohk.cl";
const PASS = "khto bghq ckfz txla";

router.post('/get', async (req, res) => {
    let { userID, lockID, type, startDate, name, endDate } = req.body;
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
            keyboardPwdType: type,
            date,
            startDate: startDate,
            keyboardPwdName: name,
            endDate: endDate,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/keyboardPwd/get',
            ttlockData, { headers }
        );
        //console.log(ttlockResponse.data)
        if (typeof ttlockResponse === 'object' && ttlockResponse.data.hasOwnProperty('keyboardPwdId')) {
            res.json(ttlockResponse.data);
        } else {
            res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/add', async (req, res) => {
    let { userID, lockID, keyboardPwd, keyboardPwdType, keyboardPwdName, startDate, endDate } = req.body;
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
            keyboardPwd: keyboardPwd,
            addType: '2',
            keyboardPwdType: keyboardPwdType,
            date,
            keyboardPwdName: keyboardPwdName,
            startDate: startDate,
            endDate: endDate,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/keyboardPwd/add',
            ttlockData, { headers }
        );
        //console.log(ttlockResponse.data)
        if (typeof ttlockResponse === 'object' && ttlockResponse.data.hasOwnProperty('keyboardPwdId')) {
            res.json(ttlockResponse.data);
        } else {
            res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/add2', async (req, res) => {
    const { userID, selectedLocks, keyboardPwd, keyboardPwdType, keyboardPwdName, startDate, endDate, email } = req.body;

    if (!userID || !selectedLocks || !Array.isArray(selectedLocks) || selectedLocks.length === 0) {
        return res.status(400).json({ errmsg: 'Missing userID or selectedLocks' });
    }
    try {
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        const locksResults = [];
        for (const lock of selectedLocks) {
            try {
                let date = Date.now()
                let ttlockData = {
                    clientId: TTLOCK_CLIENT_ID,
                    accessToken: accessToken,
                    lockId: lock.id,
                    keyboardPwd: keyboardPwd,
                    addType: '2',
                    keyboardPwdType: keyboardPwdType,
                    date,
                    keyboardPwdName: keyboardPwdName,
                    startDate: startDate,
                    endDate: endDate,
                };
                let headers = {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${accessToken}`
                };
                let ttlockResponse = await axios.post(
                    'https://euapi.ttlock.com/v3/keyboardPwd/add',
                    ttlockData, { headers }
                );
                //console.log(ttlockResponse.data)
                if (typeof ttlockResponse === 'object' && ttlockResponse.data.hasOwnProperty('keyboardPwdId')) {
                    locksResults.push({
                        lockID: lock.id,
                        lockAlias: lock.alias,
                        passcodePwd: keyboardPwd,
                        success: true
                    })
                } else {
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
        let emailResult;
        if (email && email.includes("@")) {
            const successfulLocks = locksResults.filter(r => r.success);
            if (successfulLocks.length > 0) {
                const lockAliasesString = successfulLocks.map(lock => `- ${lock.lockAlias}`).join('\n');
                const templatePath = path.join(__dirname, '..', 'nodemailer', 'templates', 'sharePasscode.html');
                const templateContent = await fs.readFile(templatePath, 'utf8');
                // Replace placeholders
                const emailContent = templateContent
                    .replace(/{{code}}/g, keyboardPwd)
                    .replace(/{{lock_alias}}/g, lockAliasesString)
                    .replace(/{{start}}/g, formatDate(startDate))
                    .replace(/{{end}}/g, formatDate(endDate));
                try {
                    const emailResponse = await transporter.sendMail({
                        from: USER,
                        to: email,
                        subject: "Un código temporal ha sido compartido contigo",
                        html: emailContent
                    });
                    emailResult = { emailContent, emailSent: true };
                } catch (emailError) {
                    console.error(emailError);
                    emailResult = { emailContent, emailSent: false, emailError: emailError.toString() };
                }
            }
        }
        res.json({
            locks: locksResults,
            email: emailResult
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with My API' });
    }
});
router.post('/delete', async (req, res) => {
    let { userID, lockID, passcodeID } = req.body;
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
            keyboardPwdId: passcodeID,
            deleteType: '2',
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/keyboardPwd/delete',
            ttlockData, { headers }
        );
        //console.log(ttlockResponse.data)
        res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/change', async (req, res) => {
    let { userID, lockID, passcodeID, newName, newPwd, newStartDate, newEndDate } = req.body;
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
            keyboardPwdId: passcodeID,
            changeType: '2',
            date,
            keyboardPwdName: newName,
            newKeyboardPwd: newPwd,
            startDate: newStartDate,
            endDate: newEndDate,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/keyboardPwd/change',
            ttlockData, { headers }
        );
        //console.log(ttlockResponse.data)
        res.json({ errcode: ttlockResponse.data.errcode, errmsg: ttlockResponse.data.errmsg });
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/getListLock', async (req, res) => {
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
            'https://euapi.ttlock.com/v3/lock/listKeyboardPwd', { params: ttlockData, headers }
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
router.post('/sendEmail', async (req, res) => {
    let { name, email, motivo, code, lock_alias, start, end } = req.body;
    console.log(req.body)
    try {
        let emailResponse;
        let emailBody = { email: email, name: name, motivo: motivo, code: code, lock_alias: lock_alias, start: start, end: end };
        emailResponse = await axios.post(URL.concat('/mail/sharePasscode'), emailBody);
        console.log(emailResponse.data.emailContent);
        res.json({ emailContent: emailResponse.data.emailContent });
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with sending email' });
    }
});
router.post('/multiplePasscodes', async (req, res) => {
    const { userID, passcodes, selectedLocks } = req.body;
    if (
        !userID ||
        !selectedLocks || !Array.isArray(selectedLocks) || selectedLocks.length === 0 ||
        !passcodes || !Array.isArray(passcodes) || passcodes.length === 0) {
        return res.status(400).json({ errmsg: 'Missing userID, selectedLocks or passcodes' });
    }
    try {
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        const results = [];
        for (const lock of selectedLocks) {
            const lockResults = [];
            for (const passcode of passcodes) {
                try {
                    let date = Date.now()
                    let ttlockData, headers, ttlockResponse;
                    if (passcode.tipo === 2) {
                        ttlockData = {
                            clientId: TTLOCK_CLIENT_ID,
                            accessToken: accessToken,
                            lockId: lock.id,
                            keyboardPwd: passcode.code,
                            keyboardPwdName: passcode.name,
                            keyboardPwdType: 2,
                            startDate: date,
                            endDate: 0,
                            addType: '2',
                            date,
                        };
                        headers = {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Authorization': `Bearer ${accessToken}`
                        };
                        ttlockResponse = await axios.post(
                            'https://euapi.ttlock.com/v3/keyboardPwd/add',
                            ttlockData, { headers }
                        );
                        //console.log(ttlockResponse.data)
                    } else {
                        ttlockData = {
                            clientId: TTLOCK_CLIENT_ID,
                            accessToken: accessToken,
                            lockId: lock.id,
                            keyboardPwdType: 2,
                            keyboardPwdName: passcode.name,
                            startDate: date,
                            endDate: 0,
                            date: date,
                        };
                        headers = {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Authorization': `Bearer ${accessToken}`
                        };
                        ttlockResponse = await axios.post(
                            'https://euapi.ttlock.com/v3/keyboardPwd/get',
                            ttlockData, { headers }
                        );
                        //console.log(ttlockResponse.data)
                    }
                    if (ttlockResponse.data && ttlockResponse.data.hasOwnProperty('keyboardPwdId')) {
                        lockResults.push({
                            passcodeName: passcode.name,
                            tipo: passcode.tipo,
                            code: passcode.code || undefined,
                            result: "success",
                            codeId: ttlockResponse.data.keyboardPwdId,
                            errcode: 0
                        });
                    } else {
                        lockResults.push({
                            passcodeName: passcode.name,
                            tipo: passcode.tipo,
                            code: passcode.code || undefined,
                            result: "failed",
                            errcode: ttlockResponse.data.errcode,
                            errmsg: ttlockResponse.data.errmsg
                        });
                    }
                } catch (error) {
                    lockResults.push({
                        passcodeName: passcode.name,
                        tipo: passcode.tipo,
                        result: "failed",
                        errcode: error.response?.data?.errcode || "UNKNOWN",
                        errmsg: error.response?.data?.errmsg || error.message
                    });
                }
            }
            results.push({
                lockId: lock.id,
                lockAlias: lock.alias,
                passcodes: lockResults
            });
        }
        res.json(Array.isArray(results) ? results : [results]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: USER,
        pass: PASS
    },
});
function formatDate(ms) {
    const d = new Date(parseInt(ms));
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}


module.exports = router;