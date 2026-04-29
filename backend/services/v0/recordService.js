//services/v0/recordService.js
const axios = require('axios');
const { buildHeaders } = require('../../utils/ttlock');

const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_BASE_URL = 'https://euapi.ttlock.com/v3';

const MAX_PAGE_SIZE = 200;
const MAX_PAGES = 50; // safety guard (optional but smart)

const getLockRecords = async ({ accessToken, lockID, startDate, endDate, recordType }) => {
    try {
        let allRecords = [];
        // ---- FIRST CALL (we need total pages) ----
        const firstResponse = await axios.get(
            `${TTLOCK_BASE_URL}/lockRecord/list`,
            {
                params: { clientId: TTLOCK_CLIENT_ID, accessToken, lockId: lockID, pageNo: 1, pageSize: MAX_PAGE_SIZE, startDate, endDate, recordType, date: Date.now() },
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
        allRecords.push(...firstData.list);
        let totalPages = firstData.pages || 1;
        // ---- SAFETY LIMIT ----
        if (totalPages > MAX_PAGES) {
            totalPages = MAX_PAGES;
        }
        // ---- LOOP REMAINING PAGES ----
        for (let page = 2; page <= totalPages; page++) {
            const response = await axios.get(
                `${TTLOCK_BASE_URL}/lockRecord/list`,
                {
                    params: { clientId: TTLOCK_CLIENT_ID, accessToken, lockId: lockID, pageNo: page, pageSize: MAX_PAGE_SIZE, startDate, endDate, recordType, date: Date.now() },
                    headers: buildHeaders(accessToken)
                }
            );
            const data = response.data;
            if (data?.list) {
                allRecords.push(...data.list);
            } else {
                // Soft fail: stop instead of crashing everything
                break;
            }
        }
        return {
            list: allRecords,
            total: allRecords.length,
            pages: totalPages
        };
    } catch (error) {
        throw {
            status: error.response?.status || 500,
            errcode: error.response?.data?.errcode,
            message: error.response?.data?.errmsg || error.message
        };
    }
};

module.exports = { getLockRecords };