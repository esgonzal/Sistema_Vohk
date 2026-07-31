const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authMiddleware');
const deviceService = require('../../services/vohk_app/deviceService');
router.use(authenticate);

router.get('/location', async (req, res) => {
    try {
        const { condominiumId } = req.query;
        const { userId, role } = req.user;
        const devices = await deviceService.getDevicesByCondominium(condominiumId);
        res.json(devices);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;