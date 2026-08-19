const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const dashboardService = require('../../services/vohk_app/dashboardService');
const router = express.Router();
router.use(authenticate);

function sendServerError(res, error, message) {
    console.error(error);
    if (error.status && error.status >= 400 && error.status < 500) {
        return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: message });
}
function isAdminRole(role) {
    return role === 'admin' || role === 'superadmin';
}

router.get('/', async (req, res) => {
    try {
        const { userId, role } = req.user;
        if (!isAdminRole(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const dashboard = await dashboardService.getDashboard(userId, role);
        return res.status(200).json(dashboard);
    } catch (error) {
        return sendServerError(res, error, 'Could not retrieve dashboard');
    }
});

module.exports = router;