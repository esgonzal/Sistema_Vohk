
const axios = require('axios');
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_BASE_URL = 'https://euapi.ttlock.com/v3';
const MAX_PAGE_SIZE = 200;

const getLockRecords = async ({ accessToken, lockID, pageNo = 1, pageSize = MAX_PAGE_SIZE }) => {
    try {
        const response = await axios.get(
            `${TTLOCK_BASE_URL}/lockRecord/list`,
            { params: { clientId: TTLOCK_CLIENT_ID, accessToken, lockId: lockID, pageNo, pageSize, date: Date.now() } }
        );
        const data = response.data;
        if (!data?.list) {
            throw { status: 400, errcode: data?.errcode, message: data?.errmsg };
        }
        return { list: data.list, total: data.total, pages: data.pages, pageNo: data.pageNo, pageSize: data.pageSize };
    } catch (error) {
        throw { status: error.response?.status || 500, errcode: error.response?.data?.errcode, message: error.response?.data?.errmsg || error.message };
    }
};

module.exports = { getLockRecords };