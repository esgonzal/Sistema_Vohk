const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authMiddleware');
const deviceService = require('../../services/vohk_app/deviceService');
router.use(authenticate);

function isAdminRole(role) {
    return role === 'admin' || role === 'superadmin';
}

router.get('/location', async (req, res) => {
    try {
        const { condominiumId } = req.query;
        const { userId, role } = req.user;
        if (!isAdminRole(role) && role !== 'staff') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const devices = await deviceService.getDevicesByCondominium(condominiumId, userId, role);
        res.json(devices);
    } catch (err) {
        console.log(err);
        const status = err.status >= 400 && err.status < 500 ? err.status : 500;
        res.status(status).json({ error: status === 500 ? 'Could not retrieve concierge devices' : err.message });
    }
});

module.exports = router;
