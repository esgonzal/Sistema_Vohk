const express = require('express');
const router = express.Router();
const axios = require('axios');
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_BASE_URL = 'https://euapi.ttlock.com/v3';
const { getAccessTokenOrFail, buildHeaders } = require('../../utils/ttlock');
const cardController = require('../../controllers/v0/cardController');

router.post('/getListLock', cardController.getLockCardList);
router.post('/add', cardController.add);
router.post('/rename', cardController.rename);
router.post('/delete', cardController.deleteCard);
router.post('/changePeriod', cardController.changePeriod);


// multipleCards NEEDS TO BE FIXED 
router.post('/multipleCards', async (req, res) => {
    let { userID, lockID, cards } = req.body;
    console.log("body: ", req.body);
    if (
        !userID ||
        !cards || !Array.isArray(cards) || cards.length === 0) {
        return res.status(400).json({ errmsg: 'Missing userID or cards' });
    }
    try {
        const storedData = accessTokenStorage[userID];
        const accessToken = storedData ? storedData.accessToken : null;
        if (!accessToken) {
            return res.json({ errcode: 10003, errmsg: 'No se encontró accessToken' });
        }
        const results = [];
        for (const card of cards) {
            //console.log("results: ", results);
            try {
                let date = Date.now()
                let ttlockData, headers, ttlockResponse;
                if (card.tipo === 1) {
                    ttlockData = {
                        clientId: TTLOCK_CLIENT_ID,
                        accessToken: accessToken,
                        lockId: lockID,
                        cardNumber: card.number,
                        cardName: card.name,
                        startDate: date,
                        endDate: 0,
                        addType: "2",
                        date,
                    };
                    console.log("ttlockData: ", ttlockData)
                    headers = {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Bearer ${accessToken}`
                    };
                    ttlockResponse = await axios.post(
                        'https://euapi.ttlock.com/v3/identityCard/add',
                        ttlockData, { headers }
                    );
                    console.log("ttlockResponse.data: ", ttlockResponse.data)
                    if (ttlockResponse.data && ttlockResponse.data.hasOwnProperty('cardId')) {
                        results.push({
                            cardName: card.name,
                            tipo: card.tipo,
                            number: card.number || undefined,
                            result: "success",
                            cardId: ttlockResponse.data.cardId,
                            errcode: 0
                        });
                    } else {
                        results.push({
                            cardName: card.name,
                            tipo: card.tipo,
                            number: card.number || undefined,
                            result: "failed",
                            errcode: ttlockResponse.data.errcode,
                            errmsg: ttlockResponse.data.errmsg
                        });
                    }
                }
            } catch (error) {
                results.push({
                    cardName: card.name,
                    tipo: card.tipo,
                    result: "failed",
                    errcode: error.response?.data?.errcode || "UNKNOWN",
                    errmsg: error.response?.data?.errmsg || error.message
                });
            }
        }
        res.json(Array.isArray(results) ? results : [results]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ errmsg: 'Error with TTLock API' });
    }
});

module.exports = router;