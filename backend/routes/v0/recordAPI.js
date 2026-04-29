//routes/v0/recordAPI.js
const express = require('express');
const router = express.Router();
const recordController = require('../../controllers/v0/recordController');

router.post('/getListLock', recordController.getLockRecordList);

module.exports = router;