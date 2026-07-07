const express = require('express');
const router = express.Router();
const { getAccessTokenOrFail, buildHeaders } = require('../../utils/ttlock');
const cardController = require('../../controllers/v0/cardController');
const cardService = require('../../services/v0/cardService');

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
        const data = await cardService.getLockCards({ accessToken, lockID });
        return res.json(data);
    } catch (error) {
        console.error('getLockCardList error:', error);
        return res.status(error.status || 500).json({
            errcode: error.errcode || 'UNKNOWN',
            errmsg: error.message || 'Error fetching lock cards'
        });
    }
});
router.post('/rename', async (req, res) => {
    const { lockID, cardID, newName } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID || !cardID || !newName) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await cardService.renameCard({ accessToken, lockID, cardID, newName });
        return res.json(data);
    } catch (error) {
        console.error('rename Card error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error renaming a card' });
    }
});
router.post('/delete', async (req, res) => {
    const { lockID, cardID } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID || !cardID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await cardService.deleteCard({ accessToken, lockID, cardID });
        return res.json(data);
    } catch (error) {
        console.error('delete Card error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error deleting a card' });
    }
});
router.post('/changePeriod', async (req, res) => {
    const { lockID, cardID, newStartDate, newEndDate } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
        return res.status(401).json({ errmsg: 'Missing access token' });
    }
    if (!lockID || !cardID || !newStartDate || !newEndDate) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    try {
        const data = await cardService.changeCardPeriod({ accessToken, lockID, cardID, newStartDate, newEndDate });
        return res.json(data);
    } catch (error) {
        console.error('change Period Card error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error changing a card period' });
    }
});
router.post('/add', cardController.add);
router.post('/multipleCards', cardController.multipleCards);

module.exports = router;