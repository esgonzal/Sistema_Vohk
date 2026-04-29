const express = require('express');
const router = express.Router();
const axios = require('axios');
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_BASE_URL = 'https://euapi.ttlock.com/v3';
const { getAccessTokenOrFail, buildHeaders } = require('../../utils/ttlock');

router.post('/add', async (req, res) => {
    const { userID, name } = req.body;
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/group/add`,
            new URLSearchParams({
                clientId: TTLOCK_CLIENT_ID,
                accessToken,
                name: name,
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
router.post('/list', async (req, res) => {
    const { userID } = req.body;
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const response = await axios.get(
            `${TTLOCK_BASE_URL}/group/list`,
            {
                params: {
                    clientId: TTLOCK_CLIENT_ID,
                    accessToken,
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
router.post('/setLock', async (req, res) => {
    const { userID, lockID, groupID } = req.body;
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/lock/setGroup`,
            new URLSearchParams({
                clientId: TTLOCK_CLIENT_ID,
                accessToken,
                lockId: lockID,
                groupId: groupID,
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
router.post('/delete', async (req, res) => {
    const { userID, groupID } = req.body;
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/group/delete`,
            new URLSearchParams({
                clientId: TTLOCK_CLIENT_ID,
                accessToken,
                groupId: groupID,
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
router.post('/rename', async (req, res) => {
    const { userID, groupID, newName } = req.body;
    try {
        const accessToken = getAccessTokenOrFail(userID, res);
        if (!accessToken) return;
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/group/update`,
            new URLSearchParams({
                clientId: TTLOCK_CLIENT_ID,
                accessToken,
                groupId: groupID,
                name: newName,
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