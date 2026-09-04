const express = require('express');
const multer = require('multer');
const authenticate = require('../../middleware/authMiddleware');
const deviceService = require('../../services/vohk_app/deviceService');
const ttlockService = require('../../services/vohk_app/ttlockService');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.use(authenticate);

function sendServerError(res, error, message) {
    console.error(error);
    if (error.status && error.status >= 400 && error.status < 600) {
        return res.status(error.status).json({
            error: error.message,
            ...(error.code !== undefined ? { code: error.code } : {}),
            ...(error.details ? { details: error.details } : {}),
        });
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
        if (!['admin', 'superadmin', 'resident', 'staff'].includes(role)) {
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
router.get('/ttlock/available', async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const locks = await ttlockService.listAvailableLocks();
        return res.status(200).json(locks);
    } catch (error) {
        return sendServerError(res, error, 'Could not retrieve TTLock devices');
    }
});
router.post('/', async (req, res) => {
    try {
        const { role } = req.user;
        const { deviceData, intercomData, ttlockData } = req.body;
        if (role !== 'superadmin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (!deviceData) {
            return res.status(400).json({ error: 'Device data is required' });
        }
        const created = await deviceService.createDevice(deviceData, intercomData, ttlockData);
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
router.post('/:deviceId/identity/refresh', async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const device = await deviceService.refreshDeviceIdentity(req.params.deviceId);
        return res.status(200).json(device);
    } catch (error) {
        return sendServerError(res, error, 'Could not refresh device identity');
    }
});
router.post('/:deviceId/provision-residents', async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const result = await deviceService.provisionExistingResidents(req.params.deviceId, req.user.userId);
        return res.status(result.ok ? 200 : 207).json(result);
    } catch (error) {
        return sendServerError(res, error, 'Could not provision residents');
    }
});
router.get('/:deviceId/access-events', async (req, res) => {
    try {
        const result = await deviceService.listIntercomAccessEvents(
            req.params.deviceId, { position: req.query.position, maxResults: req.query.maxResults, major: req.query.major, minor: req.query.minor, startTime: req.query.startTime, endTime: req.query.endTime, picEnable: req.query.picEnable === 'true', }, req.user);
        return res.status(result.ok ? 200 : result.status || 502).json(result);
    } catch (error) {
        return sendServerError(res, error, 'Could not retrieve access events');
    }
});
router.get('/:deviceId/passcodes', async (req, res) => {
    try {
        if (!isAdminRole(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const result = await ttlockService.listPasscodes(req.params.deviceId, req.user, { pageNo: req.query.pageNo, pageSize: req.query.pageSize, });
        return res.status(200).json(result);
    } catch (error) {
        return sendServerError(res, error, 'Could not retrieve TTLock passcodes');
    }
});
router.post('/:deviceId/passcodes', async (req, res) => {
    try {
        if (!isAdminRole(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const result = await ttlockService.createPasscode(req.params.deviceId, req.user, req.body);
        return res.status(201).json(result);
    } catch (error) {
        return sendServerError(res, error, 'Could not create TTLock passcode');
    }
});
router.put('/:deviceId/passcodes/:keyboardPwdId', async (req, res) => {
    try {
        if (!isAdminRole(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const result = await ttlockService.changePasscode(req.params.deviceId, req.params.keyboardPwdId, req.user, req.body);
        return res.status(200).json(result);
    } catch (error) {
        return sendServerError(res, error, 'Could not update TTLock passcode');
    }
});
router.delete('/:deviceId/passcodes/:keyboardPwdId', async (req, res) => {
    try {
        if (!isAdminRole(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const result = await ttlockService.deletePasscode(req.params.deviceId, req.params.keyboardPwdId, req.user);
        return res.status(200).json(result);
    } catch (error) {
        return sendServerError(res, error, 'Could not delete TTLock passcode');
    }
});
router.get('/:deviceId/ttlock-records', async (req, res) => {
    try {
        if (!isAdminRole(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const result = await ttlockService.listUnlockRecords(req.params.deviceId, req.user, { startDate: req.query.startDate, endDate: req.query.endDate, pageNo: req.query.pageNo, pageSize: req.query.pageSize, });
        return res.status(200).json(result);
    } catch (error) {
        return sendServerError(res, error, 'Could not retrieve TTLock records');
    }
});
router.post('/:deviceId/ttlock-refresh', async (req, res) => {
    try {
        if (!isAdminRole(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const result = await ttlockService.refreshDevice(req.params.deviceId, req.user);
        return res.status(200).json(result);
    } catch (error) {
        return sendServerError(res, error, 'Could not refresh TTLock device');
    }
});
router.post('/open-door/:deviceId', async (req, res) => {
    try {
        const result = await deviceService.openDoor(req.params.deviceId, req.user);
        if (!result) { return res.status(404).json({ ok: false, error: 'Device not found' }); }
        if (result.ok) { return res.json({ ok: true, message: 'Door opened' }); }
        return res.status(500).json({ ok: false, error: result.text });
    } catch (error) {
        return sendServerError(res, error, 'Could not open door');
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
