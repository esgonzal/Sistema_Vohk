const axios = require('axios');
const md5 = require('md5');

const API_BASE_URL = process.env.TTLOCK_API_BASE_URL || 'https://euapi.ttlock.com';
const V3_BASE_URL = `${API_BASE_URL}/v3`;
const FORM_HEADERS = { 'Content-Type': 'application/x-www-form-urlencoded' };

let cachedToken = null;

function requireConfig(name) {
    const value = process.env[name];
    if (!value) {
        const error = new Error(`Missing TTLock configuration: ${name}`);
        error.status = 503;
        throw error;
    }
    return value;
}

function ttlockError(error, operation) {
    const response = error.response?.data;
    const message = response?.errmsg || response?.description || error.message || `TTLock ${operation} failed`;
    const wrapped = new Error(message);
    wrapped.status = error.status || 502;
    wrapped.code = response?.errcode ?? error.code;
    wrapped.operation = operation;
    return wrapped;
}

function assertSuccess(data, operation) {
    if (data && data.errcode !== undefined && Number(data.errcode) !== 0) {
        const error = new Error(data.errmsg || data.description || `TTLock ${operation} failed`);
        error.status = 502;
        error.code = data.errcode;
        error.operation = operation;
        throw error;
    }
    return data;
}

function appendDefined(params, values) {
    for (const [key, value] of Object.entries(values)) {
        if (value !== undefined && value !== null && value !== '') {
            params.set(key, String(value));
        }
    }
    return params;
}

async function login() {
    const clientId = requireConfig('TTLOCK_CLIENT_ID');
    const clientSecret = requireConfig('TTLOCK_CLIENT_SECRET');
    const username = requireConfig('TTLOCK_ACCOUNT_USERNAME');
    const configuredPassword = requireConfig('TTLOCK_ACCOUNT_PASSWORD');
    const password = /^[a-f0-9]{32}$/i.test(configuredPassword)
        ? configuredPassword.toLowerCase()
        : md5(configuredPassword).toLowerCase();

    try {
        const body = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            username,
            password,
        });
        const { data } = await axios.post(`${API_BASE_URL}/oauth2/token`, body, { headers: FORM_HEADERS });
        assertSuccess(data, 'login');
        const accessToken = data.access_token || data.accessToken;
        if (!accessToken) throw new Error('TTLock login returned no access token');
        cachedToken = {
            accessToken,
            expiresAt: Date.now() + (Number(data.expires_in || 0) * 1000),
        };
        return accessToken;
    } catch (error) {
        throw ttlockError(error, 'login');
    }
}

async function getAccessToken() {
    if (process.env.TTLOCK_ACCESS_TOKEN) return process.env.TTLOCK_ACCESS_TOKEN;
    if (cachedToken && (!cachedToken.expiresAt || cachedToken.expiresAt > Date.now() + 60_000)) {
        return cachedToken.accessToken;
    }
    return login();
}

async function get(path, params = {}) {
    try {
        const accessToken = await getAccessToken();
        const { data } = await axios.get(`${V3_BASE_URL}${path}`, {
            params: {
                clientId: requireConfig('TTLOCK_CLIENT_ID'),
                accessToken,
                date: Date.now(),
                ...params,
            },
        });
        return assertSuccess(data, path);
    } catch (error) {
        throw ttlockError(error, path);
    }
}

async function post(path, params = {}) {
    try {
        const accessToken = await getAccessToken();
        const body = appendDefined(new URLSearchParams(), {
            clientId: requireConfig('TTLOCK_CLIENT_ID'),
            accessToken,
            ...params,
            date: Date.now(),
        });
        const { data } = await axios.post(`${V3_BASE_URL}${path}`, body, { headers: FORM_HEADERS });
        return assertSuccess(data, path);
    } catch (error) {
        throw ttlockError(error, path);
    }
}

async function listAccountLocks() {
    const pageSize = 1000;
    const all = [];
    for (let pageNo = 1; pageNo <= 50; pageNo += 1) {
        const data = await get('/key/list', { pageNo, pageSize });
        const list = Array.isArray(data.list) ? data.list : [];
        all.push(...list);
        if (pageNo >= Number(data.pages || 1) || list.length < pageSize) break;
    }
    return all;
}

async function unlock(lockId) {
    return post('/lock/unlock', { lockId });
}

async function listPasscodes(lockId, { pageNo = 1, pageSize = 100 } = {}) {
    return get('/lock/listKeyboardPwd', { lockId, pageNo, pageSize });
}

async function addPasscode(lockId, { keyboardPwd, keyboardPwdName, startDate = 0, endDate = 0 }) {
    return post('/keyboardPwd/add', {
        lockId,
        keyboardPwd,
        keyboardPwdName,
        startDate,
        endDate,
        addType: 2,
    });
}

async function changePasscode(lockId, keyboardPwdId, changes) {
    return post('/keyboardPwd/change', {
        lockId,
        keyboardPwdId,
        keyboardPwdName: changes.keyboardPwdName,
        newKeyboardPwd: changes.keyboardPwd,
        startDate: changes.startDate,
        endDate: changes.endDate,
        changeType: 2,
    });
}

async function deletePasscode(lockId, keyboardPwdId) {
    return post('/keyboardPwd/delete', { lockId, keyboardPwdId, deleteType: 2 });
}

async function listUnlockRecords(lockId, { startDate, endDate, pageNo = 1, pageSize = 100 } = {}) {
    return get('/lockRecord/list', { lockId, startDate, endDate, pageNo, pageSize });
}

module.exports = {
    listAccountLocks,
    unlock,
    listPasscodes,
    addPasscode,
    changePasscode,
    deletePasscode,
    listUnlockRecords,
    _private: { appendDefined, assertSuccess },
};
