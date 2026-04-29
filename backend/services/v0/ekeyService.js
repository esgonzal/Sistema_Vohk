const axios = require('axios');
const { buildHeaders } = require('../../utils/ttlock');

const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_BASE_URL = 'https://euapi.ttlock.com/v3';

const MAX_PAGE_SIZE = 200;
const MAX_PAGES = 50;

const getLockEkeys = async ({ accessToken, lockID }) => {
    try {
        const now = Date.now();
        let allEkeys = [];
        const firstResponse = await axios.get(
            `${TTLOCK_BASE_URL}/lock/listKey`,
            {
                params: { clientId: TTLOCK_CLIENT_ID, accessToken, lockId: lockID, pageNo: 1, pageSize: MAX_PAGE_SIZE, orderBy: 1, date: now },
                headers: buildHeaders(accessToken)
            }
        );
        const firstData = firstResponse.data;
        if (!firstData?.list) {
            throw { status: 400, errcode: firstData.errcode, message: firstData.errmsg };
        }
        allEkeys.push(...firstData.list);
        let totalPages = firstData.pages || 1;
        if (totalPages > MAX_PAGES) {
            totalPages = MAX_PAGES;
        }
        for (let page = 2; page <= totalPages; page++) {
            const response = await axios.get(
                `${TTLOCK_BASE_URL}/lock/listKey`,
                {
                    params: { clientId: TTLOCK_CLIENT_ID, accessToken, lockId: lockID, pageNo: page, pageSize: MAX_PAGE_SIZE, orderBy: 1, date: now },
                    headers: buildHeaders(accessToken)
                }
            );
            const data = response.data;
            if (data?.list) {
                allEkeys.push(...data.list);
            } else {
                break;
            }
        }
        return { list: allEkeys, total: allEkeys.length, pages: totalPages };
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
}

const getEkeysAccount = async ({ accessToken, groupID }) => {
    try {
        const now = Date.now();
        let allEkeys = [];
        const firstResponse = await axios.post(
            `${TTLOCK_BASE_URL}/key/list`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken: accessToken, pageNo: 1, pageSize: 1000, groupId: groupID, date: now }),
            {
                headers: buildHeaders(accessToken)
            }
        );
        const firstData = firstResponse.data;
        if (!firstData?.list) {
            throw { status: 400, errcode: firstData.errcode, message: firstData.errmsg };
        }
        allEkeys.push(...firstData.list);
        let totalPages = firstData.pages || 1;
        if (totalPages > 1000) {
            totalPages = 1000;
        }
        for (let page = 2; page <= totalPages; page++) {
            const response = await axios.post(
                `${TTLOCK_BASE_URL}/key/list`,
                new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken: accessToken, pageNo: page, pageSize: 1000, groupId: groupID, date: now }),
                {
                    headers: buildHeaders(accessToken)
                }
            );
            const data = response.data;
            if (data?.list) {
                allEkeys.push(...data.list);
            } else {
                break;
            }
        }
        return { list: allEkeys, total: allEkeys.length, pages: totalPages };
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
}

const sendEkey = async ({ accessToken, lockID, recieverName, keyName, startDate, endDate, remoteEnable, keyRight, keyType, startDay, endDay, weekDays }) => {
    try {
        const now = Date.now();
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/key/send`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken: accessToken, lockId: lockID, receiverUsername: recieverName, keyName: keyName, startDate: startDate, endDate: endDate, remoteEnable: remoteEnable, keyRight: keyRight, createUser: 1, keyType: keyType, startDay: startDay, endDay: endDay, weekDays: weekDays, date: now }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
}

const deleteEkey = async ({ accessToken, keyID }) => {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/key/delete`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken: accessToken, keyId: keyID, date: Date.now() }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
}

const modifyEkey = async ({ accessToken, keyID, newName, remoteEnable }) => {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/key/update`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken: accessToken, keyId: keyID, keyName: newName, remoteEnable: remoteEnable, date: Date.now() }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
}

const changePeriod = async ({ accessToken, keyID, newStartDate, newEndDate }) => {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/key/changePeriod`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken: accessToken, keyId: keyID, startDate: newStartDate, endDate: newEndDate, date: Date.now() }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
}

const freezeEkey = async ({ accessToken, keyID }) => {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/key/freeze`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken: accessToken, keyId: keyID, date: Date.now() }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
}

const unfreezeEkey = async ({ accessToken, keyID }) => {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/key/unfreeze`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken: accessToken, keyId: keyID, date: Date.now() }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
}

const authorizeEkey = async ({ accessToken, lockID, keyID }) => {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/key/authorize`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken: accessToken, lockId: lockID, keyId: keyID, date: Date.now() }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
}

const unauthorizeEkey = async ({ accessToken, lockID, keyID }) => {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/key/unauthorize`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken: accessToken, lockId: lockID, keyId: keyID, date: Date.now() }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
}

module.exports = { getLockEkeys, getEkeysAccount, sendEkey, deleteEkey, modifyEkey, changePeriod, freezeEkey, unfreezeEkey, authorizeEkey, unauthorizeEkey };