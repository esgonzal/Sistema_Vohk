const cardService = require('../../services/v0/cardService');
const { getAccessToken } = require('../../utils/ttlock');

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

const multipleCards = async (req, res) => {
    const { userID, lockID, cards } = req.body;
    if (!userID || !lockID || !cards) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await cardService.multipleCards({ accessToken, lockID, cards});
        return res.json(data);
    } catch (error) {
        console.error('add multipleCards error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error adding multiple cards' });
    }
}

module.exports = { add,  multipleCards };