const axios = require('axios');
const { buildHeaders } = require('../../utils/ttlock');

const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_BASE_URL = 'https://euapi.ttlock.com/v3';

const MAX_PAGE_SIZE = 200;
const MAX_PAGES = 50;

const getLockCards = async ({ accessToken, lockID }) => {
    try {
        const now = Date.now();
        let allCards = [];
        const firstResponse = await axios.get(
            `${TTLOCK_BASE_URL}/identityCard/list`,
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
        allCards.push(...firstData.list);
        let totalPages = firstData.pages || 1;
        if (totalPages > MAX_PAGES) {
            totalPages = MAX_PAGES;
        }
        for (let page = 2; page <= totalPages; page++) {
            const response = await axios.get(
                `${TTLOCK_BASE_URL}/identityCard/list`,
                {
                    params: { clientId: TTLOCK_CLIENT_ID, accessToken, lockId: lockID, pageNo: page, pageSize: MAX_PAGE_SIZE, orderBy: 1, date: now },
                    headers: buildHeaders(accessToken)
                }
            );
            const data = response.data;
            if (data?.list) {
                allCards.push(...data.list);
            } else {
                break;
            }
        }
        return {
            list: allCards,
            total: allCards.length,
            pages: totalPages
        };
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
}

const addCard = async ({ accessToken, lockID, cardName, cardNumber, startDate, endDate }) => {
    try {
        const now = Date.now();
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/identityCard/addForReversedCardNumber`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken: accessToken, lockId: lockID, cardNumber: cardNumber, cardName: cardName, startDate: startDate, endDate: endDate, addType: '2', date: now }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
}

const renameCard = async ({ accessToken, lockID, cardID, newName }) => {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/identityCard/rename`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken, lockId: lockID, cardId: cardID, cardName: newName, date: Date.now() }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
}
const deleteCard = async ({ accessToken, lockID, cardID }) => {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/identityCard/delete`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken, lockId: lockID, cardId: cardID, deleteType: '2', date: Date.now() }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
}
const changeCardPeriod = async ({ accessToken, lockID, cardID, newStartDate, newEndDate }) => {
    try {
        const response = await axios.post(
            `${TTLOCK_BASE_URL}/identityCard/changePeriod`,
            new URLSearchParams({ clientId: TTLOCK_CLIENT_ID, accessToken, lockId: lockID, cardId: cardID, changeType: '2', startDate: newStartDate, endDate: newEndDate, date: Date.now() }),
            { headers: buildHeaders(accessToken) }
        );
        return response.data;
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
}

module.exports = { getLockCards, addCard, renameCard, deleteCard, changeCardPeriod };