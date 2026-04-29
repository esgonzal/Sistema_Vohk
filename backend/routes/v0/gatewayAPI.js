const express = require('express');
const router = express.Router();
const axios = require('axios');
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_BASE_URL = 'https://euapi.ttlock.com/v3';
const { getAccessTokenOrFail, buildHeaders } = require('../../utils/ttlock');

router.post('/getListLock', async (req, res) => {
    const { userID, lockID } = req.body;
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/gateway/listByLock`,
            new URLSearchParams({
                clientId: TTLOCK_CLIENT_ID,
                accessToken,
                lockId: lockID,
                date: Date.now()
            }),
            { headers: buildHeaders(accessToken) }
        );
        return res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/getListAccount', async (req, res) => {
    let { userID, pageNo, pageSize } = req.body;
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const response = await axios.get(
            `${TTLOCK_BASE_URL}/gateway/list`,
            {
                params: {
                    clientId: TTLOCK_CLIENT_ID,
                    accessToken,
                    pageNo: pageNo,
                    pageSize: pageSize,
                    date: Date.now()
                },
                headers: buildHeaders(accessToken)
            }
        );
        if (response.data?.list) {
            return res.json(response.data);
        }
        return res.status(400).json({
            errcode: response.data.errcode,
            errmsg: response.data.errmsg
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/unlock', async (req, res) => {
    let { userID, lockID } = req.body;
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/lock/unlock`,
            new URLSearchParams({
                clientId: TTLOCK_CLIENT_ID,
                accessToken,
                lockId: lockID,
                date: Date.now()
            }),
            { headers: buildHeaders(accessToken) }
        );
        return res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/lock', async (req, res) => {
    let { userID, lockID } = req.body;
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/lock/lock`,
            new URLSearchParams({
                clientId: TTLOCK_CLIENT_ID,
                accessToken,
                lockId: lockID,
                date: Date.now()
            }),
            { headers: buildHeaders(accessToken) }
        );
        return res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/getTime', async (req, res) => {
    let { userID, lockID } = req.body;
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/lock/queryDate`,
            new URLSearchParams({
                clientId: TTLOCK_CLIENT_ID,
                accessToken,
                lockId: lockID,
                date: Date.now()
            }),
            { headers: buildHeaders(accessToken) }
        );
        return res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/adjustTime', async (req, res) => {
    let { userID, lockID } = req.body;
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/lock/updateDate`,
            new URLSearchParams({
                clientId: TTLOCK_CLIENT_ID,
                accessToken,
                lockId: lockID,
                date: Date.now()
            }),
            { headers: buildHeaders(accessToken) }
        );
        return res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/transfer', async (req, res) => {
    let { userID, receiverUsername, gatewayID } = req.body;
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/gateway/transfer`,
            new URLSearchParams({
                clientId: TTLOCK_CLIENT_ID,
                accessToken,
                receiverUsername: receiverUsername,
                gatewayIdList: gatewayID,
                date: Date.now()
            }),
            { headers: buildHeaders(accessToken) }
        );
        return res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});

module.exports = router;