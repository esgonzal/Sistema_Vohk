const axios = require('axios');
const { buildHeaders } = require('../../utils/ttlock');

const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_BASE_URL = 'https://euapi.ttlock.com/v3';

const MAX_PAGE_SIZE = 200;
const MAX_PAGES = 50;

const getLockFingerprints = async ({ accessToken, lockID }) => {
    try {
        const now = Date.now();
        let allFingerprints = [];
        const firstResponse = await axios.get(
            `${TTLOCK_BASE_URL}/fingerprint/list`,
            {
                params: { clientId: TTLOCK_CLIENT_ID, accessToken, lockId: lockID, pageNo: 1, pageSize: MAX_PAGE_SIZE, orderBy: 1, date: now },
                headers: buildHeaders(accessToken)
            }
        );
        const firstData = firstResponse.data;
        if (!firstData?.list) {
            throw {
                status: 400,
                errcode: firstData.errcode,
                message: firstData.errmsg
            };
        }
        allFingerprints.push(...firstData.list);
        let totalPages = firstData.pages || 1;
        if (totalPages > MAX_PAGES) {
            totalPages = MAX_PAGES;
        }
        for (let page = 2; page <= totalPages; page++) {
            const response = await axios.get(
                `${TTLOCK_BASE_URL}/fingerprint/list`,
                {
                    params: { clientId: TTLOCK_CLIENT_ID, accessToken, lockId: lockID, pageNo: page, pageSize: MAX_PAGE_SIZE, orderBy: 1, date: now },
                    headers: buildHeaders(accessToken)
                }
            );
            const data = response.data;
            if (data?.list) {
                allFingerprints.push(...data.list);
            } else {
                break;
            }
        }
        return {
            list: allFingerprints,
            total: allFingerprints.length,
            pages: totalPages
        };
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
};

const rename = async ({ accessToken, lockID, fingerprintID, newName }) => {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/fingerprint/rename`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken, lockId: lockID, fingerprintId: fingerprintID, fingerprintName: newName, date: Date.now() }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
};

const deleteFingerprint = async ({ accessToken, lockID, fingerprintID }) => {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/fingerprint/delete`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken, lockId: lockID, fingerprintId: fingerprintID, deleteType: '2', date: Date.now() }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
};

const changePeriod = async ({ accessToken, lockID, newStartDate, newEndDate }) => {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/fingerprint/changePeriod`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken, lockId: lockID, fingerprintId: fingerprintID, changeType: '2', startDate: newStartDate, endDate: newEndDate, date: Date.now() }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
};

module.exports = { getLockFingerprints, rename, deleteFingerprint, changePeriod };