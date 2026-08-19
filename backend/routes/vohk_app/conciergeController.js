const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authMiddleware');
const deviceService = require('../../services/vohk_app/deviceService');
router.use(authenticate);

router.get('/location', async (req, res) => {
    try {
        const { condominiumId } = req.query;
        const { userId, role } = req.user;
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const devices = await deviceService.getDevicesByCondominium(condominiumId, userId);
        res.json(devices);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;