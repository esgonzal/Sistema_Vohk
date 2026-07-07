const axios = require('axios');
const TTLOCK_BASE_URL = 'https://euapi.ttlock.com/v3';
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const ekeyService = require('./ekeyService');

function handleTTLockError(error) {
    if (error.response) {
        const err = new Error('TTLock error');
        err.ttlockResponse = error.response.data;
        throw err;
    }
    throw error;
}

async function list(accessToken) {
    try {
        const response = await axios.get(
            `${TTLOCK_BASE_URL}/group/list`,
            { params: { clientId: TTLOCK_CLIENT_ID, accessToken, date: Date.now() } }
        );
        return response.data;
    } catch (error) {
        handleTTLockError(error);
    }
}
async function add(accessToken, name) {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/group/add`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken, name, date: Date.now() }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        return response.data;
    } catch (error) {
        handleTTLockError(error);
    }
}
async function setLock(accessToken, lockID, groupID) {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/lock/setGroup`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken, lockId: lockID, groupId: groupID, date: Date.now() }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        return response.data;
    } catch (error) {
        handleTTLockError(error);
    }
}
async function remove(accessToken, groupID) {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/group/delete`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken, groupId: groupID, date: Date.now() }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        return response.data;
    } catch (error) {
        handleTTLockError(error);
    }
}
async function rename(accessToken, groupID, newName) {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/group/update`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken, groupId: groupID, name: newName, date: Date.now() }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        return response.data;
    } catch (error) {
        handleTTLockError(error);
    }
}
async function fetchAll(accessToken) {
    console.log("accesstoken en groupService: ", accessToken)
    try {
        const groupResponse = await axios.get(
            `${TTLOCK_BASE_URL}/group/list`,
            { params: { clientId: TTLOCK_CLIENT_ID, accessToken, date: Date.now() } }
        );
        console.log(groupResponse.data)
        const groups = groupResponse.data.list || [];
        groups.push({ groupId: -1, groupName: 'Sin Asociar' });
        const groupsWithLocks = await Promise.all(
            groups.map(async (group) => {
                const lockResponse = await ekeyService.getEkeysAccount({ accessToken, groupID: group.groupId });
                return {
                    ...group,
                    locks: lockResponse.list || [],
                    lockCount: lockResponse.list?.length || 0
                };
            })
        );
        return { list: groupsWithLocks };
    } catch (error) {
        if (error.ttlockResponse) {
            throw error;
        }
        if (error.response) {
            const err = new Error('TTLock error');
            err.ttlockResponse = error.response.data;
            throw err;
        }
        throw error;
    }
}

module.exports = { add, list, setLock, remove, rename, fetchAll };