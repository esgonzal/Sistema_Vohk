//routes/v0/recordAPI.js
const express = require('express');
const router = express.Router();
const recordService = require('../../services/v0/recordService');

router.post('/getListLock', async (req, res) => {
    const { lockID, pageNo, pageSize } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID) {
        return res.status(400).json({ errmsg: 'Missing lockID' });
    }
    try {
        const data = await recordService.getLockRecords({ accessToken, lockID, pageNo, pageSize });
        return res.json(data);
    } catch (error) {
        console.error('getListLock records error:', error);
        return res.status(error.status || 500).json({
            errcode: error.errcode || 'UNKNOWN',
            errmsg: error.message || 'Error fetching lock records'
        });
    }
});

module.exports = router;