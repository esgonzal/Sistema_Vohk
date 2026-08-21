const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const activityService = require('../../services/vohk_app/activityService');
const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res) => {
    try {
        const activities = await activityService.listActivities(req.user, req.query);
        return res.status(200).json(activities);
    } catch (error) {
        console.error(error);
        const status = error.status >= 400 && error.status < 500 ? error.status : 500;
        return res.status(status).json({ error: status === 500 ? 'Could not retrieve activities' : error.message });
    }
});

module.exports = router;
