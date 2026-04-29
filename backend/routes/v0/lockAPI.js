const express = require('express');
const router = express.Router();
const axios = require('axios');
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_BASE_URL = 'https://euapi.ttlock.com/v3';
const { getAccessTokenOrFail, buildHeaders } = require('../../utils/ttlock');

router.post('/list', async (req, res) => {
    const { userID, pageNo, pageSize } = req.body;
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const response = await axios.get(
            `${TTLOCK_BASE_URL}/lock/list`,
            {
                params: {
                    clientId: TTLOCK_CLIENT_ID,
                    accessToken,
                    pageNo,
                    pageSize,
                    date: Date.now()
                },
                headers: buildHeaders(accessToken)
            }
        );
        return res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/details', async (req, res) => {
    const { userID, lockID } = req.body;
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const response = await axios.get(
            `${TTLOCK_BASE_URL}/lock/detail`,
            {
                params: {
                    clientId: TTLOCK_CLIENT_ID,
                    accessToken,
                    lockId: lockID,
                    date: Date.now()
                },
                headers: buildHeaders(accessToken)
            }
        );
        return res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/setAutoLock', async (req, res) => {
    const { userID, lockID, seconds } = req.body;
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/lock/setAutoLockTime`,
            new URLSearchParams({
                clientId: TTLOCK_CLIENT_ID,
                accessToken,
                lockId: lockID,
                seconds: seconds,
                type: '2',
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
    const { userID, receiverUsername, lockID } = req.body;
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/lock/transfer`,
            new URLSearchParams({
                clientId: TTLOCK_CLIENT_ID,
                accessToken,
                receiverUsername: receiverUsername,
                lockIdList: lockID,
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
router.post('/getPassageMode', async (req, res) => {
    const { userID, lockID } = req.body;
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const response = await axios.get(
            `${TTLOCK_BASE_URL}/lock/getPassageModeConfig`,
            {
                params: {
                    clientId: TTLOCK_CLIENT_ID,
                    accessToken,
                    lockId: lockID,
                    date: Date.now()
                },
                headers: buildHeaders(accessToken)
            }
        );
        return res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/setPassageMode', async (req, res) => {
    const { userID, lockID, passageMode, startDate, endDate, isAllDay, weekDays } = req.body;
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/lock/configPassageMode`,
            new URLSearchParams({
                clientId: TTLOCK_CLIENT_ID,
                accessToken,
                lockId: lockID,
                passageMode: passageMode,
                startDate: startDate,
                endDate: endDate,
                isAllDay: isAllDay,
                weekDays: weekDays,
                type: '2',
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
router.post('/editName', async (req, res) => {
    let { userID, lockID, newName } = req.body;
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/lock/rename`,
            new URLSearchParams({
                clientId: TTLOCK_CLIENT_ID,
                accessToken,
                lockId: lockID,
                lockAlias: newName,
                date: Date.now()
            }),
            { headers: buildHeaders(accessToken) }
        );
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});

module.exports = router;