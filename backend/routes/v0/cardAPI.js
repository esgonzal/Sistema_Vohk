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
router.post('/multipleCards', cardController.multipleCards);

module.exports = router;