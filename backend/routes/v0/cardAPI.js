const express = require('express');
const router = express.Router();
const { getAccessTokenOrFail, buildHeaders } = require('../../utils/ttlock');
const cardController = require('../../controllers/v0/cardController');

router.post('/getListLock', cardController.getLockCardList);
router.post('/add', cardController.add);
router.post('/rename', cardController.rename);
router.post('/delete', cardController.deleteCard);
router.post('/changePeriod', cardController.changePeriod);
router.post('/multipleCards', cardController.multipleCards);

module.exports = router;