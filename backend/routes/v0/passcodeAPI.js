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
const passcodeService = require('../../services/v0/passcodeService');

router.post('/getListLock', async (req, res) => {
    const { lockID } = req.body || {};
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID) {
        return res.status(400).json({ errmsg: 'Missing lockID' });
    }
    try {
        const data = await passcodeService.getLockPasscodes({ accessToken, lockID });
        return res.json(data);
    } catch (error) {
        console.error('getListLock passcodes error:', error);
        return res.status(error.status || 500).json({
            errcode: error.errcode || 'UNKNOWN',
            errmsg: error.message || 'Error fetching lock passcodes'
        });
    }
});
router.post('/get', async (req, res) => {
    const { lockID, type, startDate, name, endDate } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID || !type || !startDate) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await passcodeService.getPasscode({ accessToken, lockID, type, name, startDate, endDate })
        return res.json(data);
    } catch (error) {
        console.error('getPasscode error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error getting a passcode' });
    }
});
router.post('/add', async (req, res) => {
    const { lockID, keyboardPwd, keyboardPwdType, keyboardPwdName, startDate, endDate } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID || !keyboardPwd) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await passcodeService.addPasscode({ accessToken, lockID, keyboardPwd, keyboardPwdType, keyboardPwdName, startDate, endDate })
        return res.json(data);
    } catch (error) {
        console.error('addPasscode error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error adding a passcode' });
    }
});
router.post('/delete', async (req, res) => {
    const { lockID, passcodeID } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID || !passcodeID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await passcodeService.deletePasscode({ accessToken, lockID, passcodeID });
        return res.json(data);
    } catch (error) {
        console.error('deletePasscode error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error deleting a passcode' });
    }
});
router.post('/change', async (req, res) => {
    const { lockID, passcodeID, newName, newCode } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID || !passcodeID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await passcodeService.changePasscode({ accessToken, lockID, passcodeID, newName, newCode });
        return res.json(data);
    } catch (error) {
        console.error('changePasscode error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error changing a passcode' });
    }
});

router.post('/multiplePasscodes', async (req, res) => {
    const { userID, passcodes, selectedLocks } = req.body;
    console.log("el body:", req.body);
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

module.exports = router;