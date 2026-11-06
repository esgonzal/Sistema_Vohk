const axios = require('axios');
const { buildHeaders } = require('../../utils/ttlock');

const TTLOCK_CLIENT_ID = process.env.TTLOCK_CLIENT_ID;
const TTLOCK_BASE_URL = 'https://euapi.ttlock.com/v3';

const MAX_PAGE_SIZE = 200;
const MAX_PAGES = 50;

const getLockPasscodes = async ({ accessToken, lockID }) => {
    try {
        const now = Date.now();
        let allPasscodes = [];
        const fetchPage = async (pageNo) => {
            return axios.get(`${TTLOCK_BASE_URL}/lock/listKeyboardPwd`, {
                params: { clientId: TTLOCK_CLIENT_ID, accessToken, lockId: lockID, pageNo, pageSize: MAX_PAGE_SIZE, orderBy: 1, date: now }
            });
        };
        const firstResponse = await fetchPage(1);
        const firstData = firstResponse.data;
        if (!firstData?.list) {
            throw { status: 400, errcode: firstData?.errcode, message: firstData?.errmsg };
        }

        allPasscodes.push(...firstData.list);
        let totalPages = Math.min(firstData.pages || 1, MAX_PAGES);
        for (let page = 2; page <= totalPages; page++) {
            const response = await fetchPage(page);
            const data = response.data;
            if (!data?.list) break;
            allPasscodes.push(...data.list);
        }
        return {
            list: allPasscodes, total: allPasscodes.length, pages: totalPages
        };
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
};

const getPasscode = async ({ accessToken, lockID, type, name, startDate, endDate }) => {
    try {
        const params = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken,
            lockId: lockID,
            keyboardPwdType: type,
            startDate,
            date: Date.now()
        };
        if (name !== undefined) params.keyboardPwdName = name;
        if (endDate !== undefined) params.endDate = endDate;
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/keyboardPwd/get`,
            new URLSearchParams(params),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }

}
const addPasscode = async ({ accessToken, lockID, keyboardPwd, keyboardPwdType, keyboardPwdName, startDate, endDate }) => {
    try {
        const params = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken,
            lockId: lockID,
            keyboardPwd,
            addType: '2',
            keyboardPwdType,
            date: Date.now()
        };
        if (keyboardPwdName !== undefined) params.keyboardPwdName = keyboardPwdName;
        if (startDate !== undefined) params.startDate = startDate;
        if (endDate !== undefined) params.endDate = endDate;
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/keyboardPwd/add`,
            new URLSearchParams(params),
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
        const params = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken,
            lockId: lockID,
            keyboardPwdId: passcodeID,
            changeType: '2',
            date: Date.now()
        };
        if (newName !== undefined) params.keyboardPwdName = newName;
        if (newCode !== undefined) params.newKeyboardPwd = newCode;
        if (newStartDate !== undefined) params.startDate = newStartDate;
        if (newEndDate !== undefined) params.endDate = newEndDate;
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/keyboardPwd/change`,
            new URLSearchParams(params),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };

    }
}

const multiplePasscodes = async ({ accessToken, selectedLocks, passcodes }) => {
    const results = [];

    for (const lock of selectedLocks) {
        const lockResults = [];
        for (const passcode of passcodes) {
            try {
                const now = Date.now();
                const isCustom = passcode.tipo === 2;
                const endpoint = isCustom ? 'add' : 'get';
                const params = {
                    clientId: TTLOCK_CLIENT_ID,
                    accessToken,
                    lockId: lock.id.toString(),
                    keyboardPwdName: passcode.name,
                    keyboardPwdType: '2',
                    startDate: now.toString(),
                    endDate: '0',
                    date: now.toString()
                };

                if (isCustom) {
                    params.keyboardPwd = passcode.code.toString();
                    params.addType = '2';
                }

                const response = await axios.post(
                    `${TTLOCK_BASE_URL}/keyboardPwd/${endpoint}`,
                    new URLSearchParams(params),
                    { headers: buildHeaders(accessToken) }
                );
                const data = response.data;

                if (data?.keyboardPwdId) {
                    lockResults.push({ passcodeName: passcode.name, tipo: passcode.tipo, code: passcode.code || data.keyboardPwd, result: 'success', codeId: data.keyboardPwdId, errcode: 0 });
                } else {
                    lockResults.push({ passcodeName: passcode.name, tipo: passcode.tipo, code: passcode.code, result: 'failed', errcode: data?.errcode || 'INVALID_PASSCODE', errmsg: data?.errmsg || 'Passcode could not be created' });
                }
            } catch (error) {
                lockResults.push({ passcodeName: passcode.name, tipo: passcode.tipo, code: passcode.code, result: 'failed', errcode: error.response?.data?.errcode || 'UNKNOWN', errmsg: error.response?.data?.errmsg || error.message });
            }
        }
        results.push({ lockId: lock.id, lockAlias: lock.alias, passcodes: lockResults });
    }

    return results;
};

module.exports = { getLockPasscodes, getPasscode, addPasscode, deletePasscode, changePasscode, multiplePasscodes };
