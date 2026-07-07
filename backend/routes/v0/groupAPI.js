const express = require('express');
const router = express.Router();
const groupService = require('../../services/v0/groupService');

function getAccessToken(req) {
    return req.headers.authorization?.replace('Bearer ', '');
}

router.get('/list', async (req, res) => {
    const accessToken = getAccessToken(req);
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    try {
        const data = await groupService.list(accessToken);
        return res.json(data);
    } catch (error) {
        if (error.ttlockResponse) {
            return res.status(401).json(error.ttlockResponse);
        }
        console.error(error);
        return res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/add', async (req, res) => {
    const { name } = req.body;
    const accessToken = getAccessToken(req);
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!name) {
        return res.status(400).json({ errmsg: 'Missing group name' });
    }
    try {
        const data = await groupService.add(accessToken, name);
        return res.json(data);
    } catch (error) {
        if (error.ttlockResponse) {
            return res.status(401).json(error.ttlockResponse);
        }
        console.error(error);
        return res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/setLock', async (req, res) => {
    const { lockID, groupID } = req.body;
    const accessToken = getAccessToken(req);
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID || groupID === undefined) {
        return res.status(400).json({ errmsg: 'Missing parameters' });
    }
    try {
        const data = await groupService.setLock(accessToken, lockID, groupID);
        return res.json(data);
    } catch (error) {
        if (error.ttlockResponse) {
            return res.status(401).json(error.ttlockResponse);
        }
        console.error(error);
        return res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/delete', async (req, res) => {
    const { groupID } = req.body;
    const accessToken = getAccessToken(req);
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!groupID) {
        return res.status(400).json({ errmsg: 'Missing groupID' });
    }
    try {
        const data = await groupService.remove(accessToken, groupID);
        return res.json(data);
    } catch (error) {
        if (error.ttlockResponse) {
            return res.status(401).json(error.ttlockResponse);
        }
        console.error(error);
        return res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.post('/rename', async (req, res) => {
    const { groupID, newName } = req.body;
    const accessToken = getAccessToken(req);
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!groupID || !newName) {
        return res.status(400).json({ errmsg: 'Missing parameters' });
    }
    try {
        const data = await groupService.rename(accessToken, groupID, newName);
        return res.json(data);
    } catch (error) {
        if (error.ttlockResponse) {
            return res.status(401).json(error.ttlockResponse);
        }
        console.error(error);
        return res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});
router.get('/fetchAll', async (req, res) => {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    try {
        const data = await groupService.fetchAll(accessToken);
        return res.json(data);
    } catch (error) {
        if (error.ttlockResponse) {
            return res.status(401).json(error.ttlockResponse);
        }
        console.error(error);
        return res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});

module.exports = router;