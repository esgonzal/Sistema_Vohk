const cardService = require('../../services/v0/cardService');
const { getAccessToken } = require('../../utils/ttlock');

const getLockCardList = async (req, res) => {
    const { userID, lockID } = req.body || {};
    if (!userID || !lockID) {
        return res.status(400).json({ errmsg: 'Missing userID or lockID' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await cardService.getLockCards({ accessToken, lockID });
        return res.json(data);
    } catch (error) {
        console.error('getLockCardList error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error fetching lock cards' });
    }
};
const add = async (req, res) => {
    const { userID, lockID, cardName, cardNumber, startDate, endDate } = req.body;
    if (!userID || !lockID || !cardNumber || !cardName) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await cardService.addCard({ accessToken, lockID, cardName, cardNumber, startDate, endDate });
        return res.json(data);
    } catch (error) {
        console.error('add Card error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error adding a card' });
    }
}
const rename = async (req, res) => {
    const { userID, lockID, cardID, newName } = req.body;
    if (!userID || !lockID || !cardID || !newName) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await cardService.renameCard({ accessToken, lockID, cardID, newName });
        return res.json(data);
    } catch (error) {
        console.error('add Card error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error renaming a card' });
    }
}
const deleteCard = async (req, res) => {
    const { userID, lockID, cardID } = req.body;
    if (!userID || !lockID || !cardID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await cardService.deleteCard({ accessToken, lockID, cardID });
        return res.json(data);
    } catch (error) {
        console.error('add Card error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error deleting a card' });
    }
}
const changePeriod = async (req, res) => {
    const { userID, lockID, cardID, newStartDate, newEndDate } = req.body;
    if (!userID || !lockID || !cardID || !newStartDate || !newEndDate) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await cardService.changeCardPeriod({ accessToken, lockID, cardID, newStartDate, newEndDate });
        return res.json(data);
    } catch (error) {
        console.error('add Card error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error changing a card period' });
    }
}

module.exports = { getLockCardList, add, rename, deleteCard, changePeriod };