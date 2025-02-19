const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/get', async(req, res) => {
    let { clientId, accessToken, lockId, keyboardPwdType, keyboardPwdName, startDate, endDate, date } = req.body;
    console.log("get Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !keyboardPwdType || !startDate || !date) {
        console.log("errmsg: Missing required parameters");
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            keyboardPwdType,
            startDate,
            date
        };
        if (keyboardPwdName) ttlockData.keyboardPwdName = keyboardPwdName;
        if (endDate) ttlockData.endDate = endDate;
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/keyboardPwd/get',
            ttlockData, { headers }
        );
        console.log("get response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/add', async(req, res) => {
    let { clientId, accessToken, lockId, keyboardPwd, keyboardPwdType, keyboardPwdName, startDate, endDate, addType, date } = req.body;
    console.log("add Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !keyboardPwd || !keyboardPwdType || !startDate || !addType || !date) {
        console.log("errmsg: Missing required parameters");
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            keyboardPwd,
            keyboardPwdType,
            startDate,
            addType,
            date
        };
        if (keyboardPwdName) ttlockData.keyboardPwdName = keyboardPwdName;
        if (endDate) ttlockData.endDate = endDate;
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/keyboardPwd/add',
            ttlockData, { headers }
        );
        console.log("add Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/delete', async(req, res) => {
    let { clientId, accessToken, lockId, keyboardPwdId, deleteType, date } = req.body;
    console.log("delete Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !keyboardPwdId || !deleteType || !date) {
        console.log("errmsg: Missing required parameters");
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            keyboardPwdId,
            deleteType,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/keyboardPwd/delete',
            ttlockData, { headers }
        );
        console.log("delete Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/change', async(req, res) => {
    let { clientId, accessToken, lockId, keyboardPwdId, keyboardPwdName, newKeyboardPwd, startDate, endDate, changeType, date } = req.body;
    console.log("change Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !keyboardPwdId || !changeType || !date) {
        console.log("errmsg: Missing required parameters");
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            keyboardPwdId,
            changeType,
            date
        };
        if (keyboardPwdName) ttlockData.keyboardPwdName = keyboardPwdName;
        if (newKeyboardPwd) ttlockData.newKeyboardPwd = newKeyboardPwd;
        if (startDate) ttlockData.startDate = startDate;
        if (endDate) ttlockData.endDate = endDate;
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/keyboardPwd/change',
            ttlockData, { headers }
        );
        console.log("change Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});

module.exports = router;