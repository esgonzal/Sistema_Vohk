const axios = require('axios');
const { buildHeaders } = require('../../utils/ttlock');

const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_BASE_URL = 'https://euapi.ttlock.com/v3';

const MAX_PAGE_SIZE = 200;
const MAX_PAGES = 50;

const getLockPasscodes = async ({ accessToken, lockID }) => {
    try {
        const now = Date.now();
        let allPasscodes = [];
        const firstResponse = await axios.get(
            `${TTLOCK_BASE_URL}/lock/listKeyboardPwd`,
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
        allPasscodes.push(...firstData.list);
        let totalPages = firstData.pages || 1;
        if (totalPages > MAX_PAGES) {
            totalPages = MAX_PAGES;
        }
        for (let page = 2; page <= totalPages; page++) {
            const response = await axios.get(
                `${TTLOCK_BASE_URL}/lock/listKeyboardPwd`,
                {
                    params: { clientId: TTLOCK_CLIENT_ID, accessToken, lockId: lockID, pageNo: page, pageSize: MAX_PAGE_SIZE, orderBy: 1, date: now },
                    headers: buildHeaders(accessToken)
                }
            );
            const data = response.data;
            if (data?.list) {
                allPasscodes.push(...data.list);
            } else {
                break;
            }
        }
        return {
            list: allPasscodes,
            total: allPasscodes.length,
            pages: totalPages
        };
    } catch (error) {
        throw {
            status: error.response?.status || 500,
            errcode: error.response?.data?.errcode,
            message: error.response?.data?.errmsg || error.message
        };
    }
}

const getPasscode = async ({ accessToken, lockID, type, name, startDate, endDate }) => {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/keyboardPwd/get`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken: accessToken, lockId: lockID, keyboardPwdType: type, keyboardPwdName: name, startDate: startDate, endDate: endDate, date: Date.now() }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }

}
const addPasscode = async ({ accessToken, lockID, keyboardPwd, keyboardPwdType, keyboardPwdName, startDate, endDate }) => {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/keyboardPwd/add`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken: accessToken, lockId: lockID, keyboardPwd: keyboardPwd, addType: '2', keyboardPwdType: keyboardPwdType, keyboardPwdName: keyboardPwdName, startDate: startDate, endDate: endDate, date: Date.now() }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
}
const deletePasscode = async ({ accessToken, lockID, passcodeID }) => {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/keyboardPwd/delete`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken: accessToken, lockId: lockID, keyboardPwdId: passcodeID, deleteType: '2', date: Date.now() }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };

    }
}
const changePasscode = async ({ accessToken, lockID, passcodeID, newName, newCode, newStartDate, newEndDate }) => {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/keyboardPwd/change`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken, lockId: lockID, keyboardPwdId: passcodeID, changeType: '2', keyboardPwdName: newName, newKeyboardPwd: newCode, startDate: newStartDate, endDate: newEndDate, date: Date.now() }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };

    }
}

module.exports = { getLockPasscodes, getPasscode, addPasscode, deletePasscode, changePasscode };