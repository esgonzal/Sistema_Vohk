const ekeyService = require('../../services/v0/ekeyService');
const { getAccessToken } = require('../../utils/ttlock');

const getLockEkeyList = async (req, res) => {
    const { userID, lockID } = req.body || {};
    console.log(req.body);
    if (!userID || !lockID) {
        return res.status(400).json({ errmsg: 'Missing userID or lockID' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await ekeyService.getLockEkeys({ accessToken, lockID });
        return res.json(data);
    } catch (error) {
        console.error('getLockEkeyList error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error fetching lock ekeys' });
    }
}

const getEkeyListAccount = async (req, res) => {
    const { userID, groupID } = req.body;
    if (!userID) {
        return res.status(400).json({ errmsg: 'Missing userID' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await ekeyService.getEkeysAccount({ accessToken, groupID });
        return res.json(data);
    } catch (error) {
        console.error('getEkeyListAccount error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error getting ekeys from account' });
    }
}

const send = async (req, res) => {
    const { userID, lockID, recieverName, keyName, startDate, endDate, remoteEnable, keyRight, keyType, startDay, endDay, weekDays } = req.body;
    if (!userID || !lockID || !recieverName, !keyName || !startDate) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await ekeyService.sendEkey({ accessToken, lockID, recieverName, keyName, startDate, endDate, remoteEnable, keyRight, keyType, startDay, endDay, weekDays })
        return res.json(data);
    } catch (error) {
        console.error('sendEkey error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error sending ekey' });
    }
}

const deleteEkey = async (req, res) => {
    const { userID, keyID } = req.body;
    if (!userID || !keyID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await ekeyService.deleteEkey({ accessToken, keyID });
        return res.json(data);
    } catch (error) {
        console.error('deleteEkey error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error deleting ekey' });
    }
}

const modify = async (req, res) => {
    const { userID, keyID, newName, remoteEnable } = req.body;
    if (!userID || !keyID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await ekeyService.modifyEkey({ accessToken, keyID, newName, remoteEnable });
        return res.json(data);
    } catch (error) {
        console.error('modifyEkey error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error modifying ekey' });
    }
}

const changePeriod = async (req, res) => {
    const { userID, keyID, newStartDate, newEndDate } = req.body;
    if (!userID || !keyID || !newStartDate, !newEndDate) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await ekeyService.changePeriod({ accessToken, keyID, newStartDate, newEndDate });
        return res.json(data);
    } catch (error) {
        console.error('changePeriodEkey error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error changing ekey period' });
    }
}

const freeze = async (req, res) => {
    const { userID, keyID } = req.body;
    if (!userID || !keyID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await ekeyService.freezeEkey(accessToken, keyID);
        return res.json(data);
    } catch (error) {
        console.error('freezeEkey error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error freezing ekey' });
    }
}

const unfreeze = async (req, res) => {
    const { userID, keyID } = req.body;
    if (!userID || !keyID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await ekeyService.unfreezeEkey(accessToken, keyID);
        return res.json(data);
    } catch (error) {
        console.error('unfreezeEkey error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error unfreezing ekey' });
    }
}

const auth = async (req, res) => {
    const { userID, lockID, keyID } = req.body;
    if (!userID || !lockID || !keyID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await ekeyService.authorizeEkey(accessToken, lockID, keyID);
        return res.json(data);
    } catch (error) {
        console.error('authorizeEkey error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error authorizing ekey' });
    }
}

const unauth = async (req, res) => {
    const { userID, lockID, keyID } = req.body;
    if (!userID || !lockID || !keyID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await ekeyService.unauthorizeEkey(accessToken, lockID, keyID);
        return res.json(data);
    } catch (error) {
        console.error('unauthorizeEkey error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error unauthorizing ekey' });
    }
}

module.exports = { getLockEkeyList, getEkeyListAccount, send, deleteEkey, modify, changePeriod, freeze, unfreeze, auth, unauth };