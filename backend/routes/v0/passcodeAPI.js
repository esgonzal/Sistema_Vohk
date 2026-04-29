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
const TTLOCK_BASE_URL = 'https://euapi.ttlock.com/v3';
const { getAccessTokenOrFail, buildHeaders } = require('../../utils/ttlock');
const passcodeController = require('../../controllers/v0/passcodeController');

router.post('/getListLock', passcodeController.getLockPasscodeList);
router.post('/get', passcodeController.get);
router.post('/add', passcodeController.add);
router.post('/delete', passcodeController.deletePasscode);
router.post('/change', passcodeController.change);

router.post('/add2', async (req, res) => {
    const { userID, selectedLocks, keyboardPwd, keyboardPwdType, keyboardPwdName, startDate, endDate, email } = req.body;
    if (!userID || !Array.isArray(selectedLocks) || selectedLocks.length === 0) {
        return res.status(400).json({ errmsg: 'Missing userID or selectedLocks' });
    }
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const locksResults = [];
        for (const lock of selectedLocks) {
            try {
                const response = await axios.post(
                    `${TTLOCK_BASE_URL}/keyboardPwd/add`,
                    new URLSearchParams({
                        clientId: TTLOCK_CLIENT_ID,
                        accessToken,
                        lockId: lock.id,
                        keyboardPwd,
                        addType: '2',
                        keyboardPwdType,
                        keyboardPwdName,
                        startDate,
                        endDate,
                        date: Date.now()
                    }),
                    { headers: buildHeaders(accessToken) }
                );
                if (response.data?.keyboardPwdId) {
                    locksResults.push({
                        lockID: lock.id,
                        lockAlias: lock.alias,
                        passcodePwd: keyboardPwd,
                        success: true
                    });
                } else {
                    locksResults.push({
                        lockID: lock.id,
                        lockAlias: lock.alias,
                        success: false,
                        errcode: response.data.errcode,
                        errmsg: response.data.errmsg
                    });
                }
            } catch (lockError) {
                console.error(lockError);
                locksResults.push({
                    lockID: lock.id,
                    lockAlias: lock.alias,
                    success: false,
                    errcode: lockError.response?.data?.errcode || 'UNKNOWN',
                    errmsg: lockError.response?.data?.errmsg || lockError.message
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
    console.log(req.body);
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
                console.log(lockResults);
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