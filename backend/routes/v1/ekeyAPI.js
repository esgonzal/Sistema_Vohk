const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/send', async(req, res) => {
    let { clientId, accessToken, lockId, receiverUsername, keyName, startDate, endDate, remarks, remoteEnable, keyRight, date } = req.body;
    console.log("send Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !receiverUsername || !keyName || !startDate || !endDate || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            receiverUsername,
            keyName,
            startDate,
            endDate,
            date
        };
        if (remarks) ttlockData.remarks = remarks;
        if (remoteEnable) ttlockData.remoteEnable = remoteEnable;
        if (keyRight) ttlockData.keyRight = keyRight;
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/send',
            ttlockData, { headers }
        );
        console.log("send Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
})
router.get('/list', async(req, res) => {
    let { clientId, accessToken, lockAlias, groupId, pageNo, pageSize, date } = req.query;
    console.log("list Request: ", req.query);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !pageNo || !pageSize || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            pageNo,
            pageSize,
            date
        };
        if (lockAlias) ttlockData.lockAlias = lockAlias;
        if (groupId) ttlockData.groupId = groupId;
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/key/list', { params: ttlockData, headers }
        );
        console.log("list Response:", ttlockResponse.data);
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/delete', async(req, res) => {
    let { clientId, accessToken, keyId, date } = req.body;
    console.log("delete Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !keyId || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            keyId,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/delete',
            ttlockData, { headers }
        );
        console.log("delete Response:", ttlockResponse.data);
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/freeze', async(req, res) => {
    let { clientId, accessToken, keyId, date } = req.body;
    console.log("freeze Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !keyId || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            keyId,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/freeze',
            ttlockData, { headers }
        );
        console.log("freeze Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/unfreeze', async(req, res) => {
    let { clientId, accessToken, keyId, date } = req.body;
    console.log("unfreeze Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !keyId || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            keyId,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/unfreeze',
            ttlockData, { headers }
        );
        console.log("unfreeze Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/modify', async(req, res) => {
    let { clientId, accessToken, keyId, keyName, remoteEnable, date } = req.body;
    console.log("modify Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !keyId || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            keyId,
            date
        };
        if (keyName) ttlockData.keyName = keyName;
        if (remoteEnable) ttlockData.remoteEnable = remoteEnable;
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/update',
            ttlockData, { headers }
        );
        console.log("modify Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/changePeriod', async(req, res) => {
    let { clientId, accessToken, keyId, startDate, endDate, date } = req.body;
    console.log("changePeriod Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !keyId || !startDate || !endDate || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            keyId,
            startDate,
            endDate,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/changePeriod',
            ttlockData, { headers }
        );
        console.log("changePeriod Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/authorize', async(req, res) => {
    let { clientId, accessToken, lockId, keyId, date } = req.body;
    console.log("authorize Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !keyId || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            keyId,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/authorize',
            ttlockData, { headers }
        );
        console.log("authorize Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});
router.post('/unauthorize', async(req, res) => {
    let { clientId, accessToken, lockId, keyId, date } = req.body;
    console.log("unauthorize Request: ", req.body);
    // Verificar si faltan parámetros obligatorios
    if (!clientId || !accessToken || !lockId || !keyId || !date) {
        return res.status(400).json({
            errmsg: "Missing required parameters",
        });
    }
    try {
        let ttlockData = {
            clientId,
            accessToken,
            lockId,
            keyId,
            date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/key/unauthorize',
            ttlockData, { headers }
        );
        console.log("unauthorize Response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});

module.exports = router;