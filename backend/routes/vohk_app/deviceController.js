const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authMiddleware');
const deviceService = require('../../services/vohk_app/deviceService');
router.use(authenticate);

function sendServerError(res, error, message) {
    console.error(error);
    if (error.status && error.status >= 400 && error.status < 500) {
        return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: message });
}

router.post('/open-door/:deviceId', async (req, res) => {
    try {
        const result = await deviceService.openDoor(req.params.deviceId);
        if (!result) { return res.status(404).json({ ok: false, error: 'Device not found' }); }
        if (result.ok) { return res.json({ ok: true, message: 'Door opened' }); }
        return res.status(500).json({ ok: false, error: result.text });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
router.get('/resident/access-methods', async (req, res) => {
    try {
        const { userId } = req.user;
        const methods = await deviceService.getAccessMethods(userId);
        res.json(methods);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/resident/dynamic-code', async (req, res) => {
    try {
        const { userId } = req.user;
        const { dynamicCode } = req.body;
        if (typeof dynamicCode !== 'string' || !/^\d{6}$/.test(dynamicCode)) {
            return res.status(400).json({ error: 'Dynamic code must contain exactly 6 digits' });
        }
        const result = await deviceService.updateResidentDynamicCode(userId, dynamicCode);
        return res.status(200).json(result);
    } catch (error) {
        return sendServerError(res, error, 'Could not update dynamic code');
    }
});

module.exports = router;