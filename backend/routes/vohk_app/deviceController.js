const express = require('express');
const multer = require('multer');
const authenticate = require('../../middleware/authMiddleware');
const deviceService = require('../../services/vohk_app/deviceService');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
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

router.get('/condominium/:condominiumId', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { condominiumId } = req.params;
        if (!isAdminRole(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const devices = await deviceService.getDevicesByCondominium(condominiumId, userId, role);
        return res.status(200).json(devices);
    } catch (error) {
        return sendServerError(res, error, 'Could not retrieve devices');
    }
});
router.get('/location-mobile', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { condominiumId } = req.query;
        if (!['admin', 'superadmin', 'resident'].includes(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (typeof condominiumId !== 'string' || condominiumId.trim() === '') {
            return res.status(400).json({ error: 'Condominium ID is required' });
        }
        const devices = await deviceService.getMobileDevices({ userId, role, condominiumId });
        return res.status(200).json(devices);
    } catch (error) {
        return sendServerError(res, error, 'Could not retrieve devices');
    }
});
router.post('/', async (req, res) => {
    try {
        const { role } = req.user;
        const { deviceData, intercomData } = req.body;
        if (role !== 'superadmin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (!deviceData) {
            return res.status(400).json({ error: 'Device data is required' });
        }
        const created = await deviceService.createDevice(deviceData, intercomData);
        return res.status(201).json(created);
    } catch (error) {
        return sendServerError(res, error, 'Could not create device');
    }
});
router.put('/:deviceId/name', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { deviceId } = req.params;
        const { name } = req.body;
        if (!isAdminRole(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ error: 'Device name is required' });
        }
        const updated = await deviceService.updateDeviceName(deviceId, userId, role, name.trim());
        return res.status(200).json(updated);
    } catch (error) {
        return sendServerError(res, error, 'Could not update device');
    }
});
router.put('/:deviceId/zone', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { deviceId } = req.params;
        const { zoneId } = req.body;
        if (!isAdminRole(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (typeof zoneId !== 'string' || zoneId.trim() === '') {
            return res.status(400).json({ error: 'Zone ID is required' });
        }
        const updated = await deviceService.moveDeviceToZone(deviceId, zoneId, userId, role);
        return res.status(200).json(updated);
    } catch (error) {
        return sendServerError(res, error, 'Could not move device');
    }
});
router.delete('/:deviceId', async (req, res) => {
    try {
        const { role } = req.user;
        const { deviceId } = req.params;
        if (role !== 'superadmin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await deviceService.deleteDevice(deviceId);
        return res.status(200).json({ success: true });
    } catch (error) {
        return sendServerError(res, error, 'Could not delete device');
    }
});
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
router.put('/resident/face', upload.single('photo'), async (req, res) => {
    try {
        const { userId } = req.user;
        if (!req.file) {
            return res.status(400).json({ error: 'Face photo is required' });
        }
        const result = await deviceService.updateResidentFace(userId, req.file);
        return res.status(200).json(result);
    } catch (error) {
        return sendServerError(res, error, 'Could not update resident face');
    }
});
router.delete('/resident/face', async (req, res) => {
    try {
        const { userId } = req.user;
        const result = await deviceService.deleteResidentFace(userId);
        return res.status(200).json(result);
    } catch (error) {
        return sendServerError(res, error, 'Could not delete resident face');
    }
});

module.exports = router;