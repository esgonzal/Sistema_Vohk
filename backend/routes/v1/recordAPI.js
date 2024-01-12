const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/list', async(req, res) => {
    let { clientId, accessToken, lockId, startDate, endDate, pageNo, pageSize, uid, recordType, searchStr, date } = req.query;
    try {
        let ttlockData = {
            clientId: clientId,
            accessToken: accessToken,
            lockId: lockId,
            startDate: startDate,
            endDate: endDate,
            pageNo: pageNo,
            pageSize: pageSize,
            uid: uid,
            recordType: recordType,
            searchStr: searchStr,
            date: date
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        let ttlockResponse = await axios.get(
            'https://euapi.ttlock.com/v3/lockRecord/list', { params: ttlockData, headers }
        );
        console.log("recordList response:", ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with API' });
    }
});

module.exports = router;