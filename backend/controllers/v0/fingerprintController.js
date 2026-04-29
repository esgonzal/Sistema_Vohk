const fingerprintService = require('../../services/v0/fingerprintService');
const { getAccessToken } = require('../../utils/ttlock');

const getLockFingerprintList = async (req, res) => {
    const { userID, lockID } = req.body || {};
    if (!userID || !lockID) {
        return res.status(400).json({ errmsg: 'Missing userID or lockID' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await fingerprintService.getLockFingerprints({ accessToken, lockID });
        return res.json(data);
    } catch (error) {
        console.error('getLockFingerprintList error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error fetching lock fingerprints' });
    }
};

const renameFingerprint = async (req, res) => {
    const { userID, lockID, fingerprintID, newName } = req.body || {};
    if (!userID || !lockID || !fingerprintID || !newName) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await fingerprintService.rename({ accessToken, lockID, fingerprintID, newName });
        return res.json(data);
    } catch (error) {
        console.error('renameFingerprint error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error renaming fingerprint' });
    }
};

const deleteFingerprint = async (req, res) => {
    const { userID, lockID, fingerprintID } = req.body || {};
    if (!userID || !lockID || !fingerprintID) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await fingerprintService.deleteFingerprint(accessToken, lockID, fingerprintID);
        return res.json(data);
    } catch (error) {
        console.error('deleteFingerprint error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error deleting fingerprint' });
    }
}
const changeFingerprintPeriod = async (req, res) => {
    const { userID, lockID, fingerprintID, newStartDate, newEndDate } = req.body;
    if (!userID || !lockID || !fingerprintID || !newStartDate || !newEndDate) {
        return res.status(400).json({ errmsg: 'Missing required fields' });
    }
    const accessToken = getAccessToken(userID);
    if (!accessToken) {
        return res.status(401).json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
    }
    try {
        const data = await fingerprintService.changeFingerprintPeriod(accessToken, lockID, fingerprintID, newStartDate, newEndDate);
        return res.json(data);
    } catch (error) {
        console.error('changeFingerprintPeriod error:', error);
        return res.status(error.status || 500).json({ errcode: error.errcode || 'UNKNOWN', errmsg: error.message || 'Error changing fingerprint period' });
    }
}

module.exports = { getLockFingerprintList, renameFingerprint, deleteFingerprint, changeFingerprintPeriod };