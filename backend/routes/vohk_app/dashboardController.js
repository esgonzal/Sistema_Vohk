const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authMiddleware');
const dashboardService = require('../../services/vohk_app/dashboardService');
router.use(authenticate);

router.get('/', async (req, res) => {
    try {
        const { userId, role } = req.user;
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        res.json(await dashboardService.getDashboard(userId));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;