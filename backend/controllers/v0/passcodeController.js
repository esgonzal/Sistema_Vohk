const passcodeService = require('../../services/v0/passcodeService');
const { getAccessToken } = require('../../utils/ttlock');

const getLockPasscodeList = async (req, res) => {
    const { userID, lockID } = req.body || {};
    if (!userID || !lockID) {
        return res.status(400).json({ errmsg: 'Missing userID or lockID' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await passcodeService.getLockPasscodes({ accessToken, lockID });
        return res.json(data);
    } catch (error) {
        console.error('getLockPasscodeList error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error fetching lock passcodes' });
    }
}

const get = async (req, res) => {
    const { userID, lockID, type, startDate, name, endDate } = req.body;
    if (!userID || !lockID || !type || !startDate) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await passcodeService.getPasscode(accessToken, lockID, type, name, startDate, endDate)
        return res.json(data);
    } catch (error) {
        console.error('getPasscode error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error getting a passcode' });
    }
}

const add = async (req, res) => {
    const { userID, lockID, keyboardPwd, keyboardPwdType, keyboardPwdName, startDate, endDate } = req.body;
    if (!userID || !lockID || !keyboardPwd) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await passcodeService.addPasscode(accessToken, lockID, keyboardPwd, keyboardPwdType, keyboardPwdName, startDate, endDate)
        return res.json(data);
    } catch (error) {
        console.error('addPasscode error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error adding a passcode' });
    }
}

const deletePasscode = async (req, res) => {
    const { userID, lockID, passcodeID } = req.body;
    if (!userID || !lockID || !passcodeID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await passcodeService.deletePasscode(accessToken, lockID, passcodeID);
        return res.json(data);
    } catch (error) {
        console.error('deletePasscode error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error deleting a passcode' });
    }
}

const change = async (req, res) => {
    const { userID, lockID, passcodeID } = req.body;
    if (!userID || !lockID || !passcodeID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await passcodeService.changePasscode(accessToken, lockID, passcodeID, newName, newCode,);
        return res.json(data);
    } catch (error) {
        console.error('changePasscode error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error changing a passcode' });
    }
}

module.exports = { getLockPasscodeList, get, add, deletePasscode, change };