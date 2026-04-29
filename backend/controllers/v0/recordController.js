//controllers/v0/recordController.js
const recordService = require('../../services/v0/recordService');
const { getAccessToken } = require('../../utils/ttlock');

const getLockRecordList = async (req, res) => {
    const { userID, lockID, startDate, endDate, recordType } = req.body || {};
    // Basic validation
    if (!userID || !lockID) {
        return res.status(400).json({ errmsg: 'Missing userID or lockID' });
    }
    // Get token (no HTTP side effects here)
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await recordService.getLockRecords({ accessToken, lockID, startDate, endDate, recordType });
        return res.json(data);
    } catch (error) {
        console.error('getLockRecordList error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error fetching lock records' });
    }
};

module.exports = { getLockRecordList };