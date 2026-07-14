const axios = require('axios');
const md5 = require('md5');
const { buildHeaders } = require('../../utils/ttlock');
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_BASE_URL = 'https://euapi.ttlock.com/v3';
const MAX_PAGE_SIZE = 200;
const MAX_PAGES = 50;
const userService = require('../../services/v0/userService');
const emailService = require('../../services/v0/emailService');
const moment = require('moment');

const getLockEkeys = async ({ accessToken, lockID }) => {
    try {
        const now = Date.now();
        let allEkeys = [];
        const fetchPage = async (pageNo) => {
            return axios.get(`${TTLOCK_BASE_URL}/lock/listKey`, {
                params: { clientId: TTLOCK_CLIENT_ID, accessToken, lockId: lockID, pageNo, pageSize: MAX_PAGE_SIZE, orderBy: 1, date: now },
            });
        };
        const firstResponse = await fetchPage(1);
        const firstData = firstResponse.data;
        if (!firstData?.list) {
            throw { status: 400, errcode: firstData?.errcode, message: firstData?.errmsg };
        }
        allEkeys.push(...firstData.list);
        let totalPages = Math.min(firstData.pages || 1, MAX_PAGES);
        for (let page = 2; page <= totalPages; page++) {
            const response = await fetchPage(page);
            const data = response.data;
            if (!data?.list) break;
            allEkeys.push(...data.list);
        }
        return { list: allEkeys, total: allEkeys.length, pages: totalPages };
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
};
const getEkeysAccount = async ({ accessToken, groupID }) => {
    try {
        const now = Date.now();
        let allEkeys = [];
        const firstResponse = await axios.post(
            `${TTLOCK_BASE_URL}/key/list`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken: accessToken, pageNo: 1, pageSize: 1000, groupId: groupID, date: now }),
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
        if (error.response) {
            const err = new Error(error.response.data.errmsg);
            err.status = error.response.status;
            err.ttlockResponse = error.response.data;
            throw err;
        }
        throw error;
    }
}
const sendEkey = async ({ accessToken, lockID, receiverName, keyName, startDate, endDate, remoteEnable, keyRight, keyType, startDay, endDay, weekDays }) => {
    try {
        const now = Date.now();
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/key/send`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken: accessToken, lockId: lockID, receiverUsername: receiverName, keyName: keyName, startDate: startDate, endDate: endDate, remoteEnable: remoteEnable, keyRight: keyRight, createUser: 1, keyType: keyType, startDay: startDay, endDay: endDay, weekDays: weekDays, date: now }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
}
const sendMany = async ({ accessToken, locks, receiverName, keyName, startDate, endDate, keyRight, remoteEnable, notifyEmail, email }) => {
    const results = [];
    for (const lock of locks) {
        try {
            const response = await sendEkey({ accessToken, lockID: lock.lockId, receiverName: receiverName, keyName, startDate, endDate, remoteEnable, keyRight, createUser: 1 });
            results.push({ lockId: lock.lockId, lockAlias: lock.lockAlias, success: true, keyId: response.keyId });
        } catch (error) {
            results.push({ lockId: lock.lockId, lockAlias: lock.lockAlias, success: false, errcode: error.errcode, message: error.message });
        }
    }
    if (notifyEmail) {
        const formattedStartDate = startDate === "0" ? "Permanente" : moment(Number(startDate)).format("DD/MM/YYYY HH:mm");
        const formattedEndDate = endDate === "0" ? "Permanente" : moment(Number(endDate)).format("DD/MM/YYYY HH:mm");
        const isNewUser = await isNewTTLockUser(receiverName);
        const password = receiverName.slice(-6);
        await emailService.sendEkeyEmail({ toEmail: email, receiverName, locks: results.filter(r => r.success), startDate: formattedStartDate, endDate: formattedEndDate, isNewUser, password });
    }
    return {
        success: results.every(r => r.success),
        created: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
    };

};
const sendMultiple = async ({ accessToken, locks, receivers, startDate, endDate, keyRight, remoteEnable, notifyEmail }) => {
    const results = [];
    for (const receiver of receivers) {
        console.log("creating an eKey for: ", receiver)
        const receiverResults = [];
        for (const lock of locks) {
            console.log("For the lock: ", lock)
            try {
                const response = await sendEkey({ accessToken, lockID: lock.lockId, receiverName: receiver.receiver, keyName: receiver.keyName, startDate, endDate, remoteEnable, keyRight, createUser: 1 });
                const result = { receiver: receiver.receiver, receiverName: receiver.receiverName, department: receiver.department, keyName: receiver.keyName, lockId: lock.lockId, lockAlias: lock.lockAlias, success: true, keyId: response.keyId };
                receiverResults.push(result);
                results.push(result);
            } catch (error) {
                const result = { receiver: receiver.receiver, receiverName: receiver.receiverName, department: receiver.department, lockId: lock.lockId, lockAlias: lock.lockAlias, success: false, errcode: error.errcode, message: error.message };
                receiverResults.push(result);
                results.push(result);
            }
        }
        if (notifyEmail) {
            const isNewUser = await isNewTTLockUser(receiver.receiver);
            const password = receiver.receiver.slice(-6);
            await emailService.sendEkeyEmail({ toEmail: receiver.notificationEmail, receiverName: receiver.receiver, locks: receiverResults.filter(r => r.success), startDate, endDate, isNewUser, password });
        }
    }
    return { success: results.every(r => r.success), createdCount: results.filter(r => r.success).length, failedCount: results.filter(r => !r.success).length, results };
};
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
const modifyEkey = async ({ accessToken, keyID, newName }) => {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/key/update`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken: accessToken, keyId: keyID, keyName: newName, date: Date.now() }),
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
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken: accessToken, keyId: keyID, startDate: Date.now(), endDate: newEndDate, date: Date.now() }),
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
const isNewTTLockUser = async (username) => {
    try {
        const rawPassword = username.slice(-6);
        const password = md5(rawPassword);
        const response = await userService.login(username, password);
        return true;
    } catch (err) {
        return false;
    }
};

module.exports = { getLockEkeys, getEkeysAccount, sendEkey, sendMany, sendMultiple, deleteEkey, modifyEkey, changePeriod, freezeEkey, unfreezeEkey, authorizeEkey, unauthorizeEkey };