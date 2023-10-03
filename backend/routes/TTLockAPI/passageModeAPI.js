const express = require('express');
const router = express.Router();
const axios = require('axios');

const { accessTokenStorage } = require('./accessTokenStorage'); 
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';

router.post('/get', async (req, res) => {
    let { userID, lockID } = req.body;
    try {
        let date = Date.now()
        const accessToken = accessTokenStorage[userID] || null;
        if (!accessToken) {
            return res.status(401).json({ error: 'Access token not found for this user' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockID,
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/getPassageModeConfig',
            ttlockData,
            { headers }
        );
        //console.log(ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error with TTLock API' });
    }
});
router.post('/set', async (req, res) => {
    let { userID, lockID, passageMode, startDate, endDate, isAllDay, formatted_weekDays } = req.body;
    try {
        let date = Date.now()
        const accessToken = accessTokenStorage[userID] || null;
        if (!accessToken) {
            return res.status(401).json({ error: 'Access token not found for this user' });
        }
        let ttlockData = {
            clientId: TTLOCK_CLIENT_ID,
            accessToken: accessToken,
            lockId: lockID,
            passageMode: passageMode,
            startDate: startDate,
            endDate: endDate,
            isAllDay: isAllDay,
            weekDays: formatted_weekDays,
            type: '2',
            date,
        };
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${accessToken}`
        };
        let ttlockResponse = await axios.post(
            'https://euapi.ttlock.com/v3/lock/configPassageMode',
            ttlockData,
            { headers }
        );
        //console.log(ttlockResponse.data)
        res.json(ttlockResponse.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error with TTLock API' });
    }
});
// Export the TTLock router
module.exports = router;