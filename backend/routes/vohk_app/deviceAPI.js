const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const authenticate = require('../../middleware/authMiddleware');
router.use(authenticate);
const deviceService = require('../../services/vohk_app/deviceService');
const propertyService = require('../../services/vohk_app/propertyService');


function sendServerError(res, error, message) {
    console.error(error);
    if (error.status && error.status >= 400 && error.status < 500) {
        return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: message });
}
// ── Device listing ────────────────────────────────────────────────────────────
router.get('/intercoms', async (req, res) => {
    try {
        const intercoms = await deviceService.listIntercoms();
        res.json(intercoms);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.get('/cameras', async (req, res) => {
    try {
        const cameras = await deviceService.listCameras();
        res.json(cameras);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
// ── Device management ─────────────────────────────────────────────────────────

router.get('/location-mobile', async (req, res) => {
    try {
        const { userId, tenantId, role } = req.user;
        const { condominiumId } = req.query;
        let targetCondominiumId;
        if (role === 'admin') {
            const condominium = await propertyService.findCurrentCondominium(userId, tenantId);
            if (!condominium) {
                return res.status(404).json({ error: 'No condominium found for admin' });
            }
            targetCondominiumId = condominium.condominium_id;
        } else if (role === 'resident') {
            if (!condominiumId) {
                return res.status(400).json({ error: 'condominiumId is required' });
            }
            targetCondominiumId = condominiumId;
        }
        const devices = await deviceService.getDevicesByCondominium(targetCondominiumId, null);
        res.json(devices);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
});
router.get('/zone/:zoneId', async (req, res) => {
    try {
        const devices = await deviceService.getDevicesByZone(req.params.zoneId);
        res.json(devices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/', async (req, res) => {
    try {
        const { deviceData, intercomData } = req.body;
        const { tenantId } = req.user;
        const created = await deviceService.createDevice(deviceData, intercomData, tenantId);
        res.status(201).json(created);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { deviceData, intercomData } = req.body;
        const { tenantId } = req.user;
        const updated = await deviceService.updateDevice(deviceId, tenantId, deviceData, intercomData);
        if (!updated) { return res.status(404).json({ error: 'Device not found' }); }
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.delete('/:deviceId', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const deleted = await deviceService.deleteDevice(req.params.deviceId, tenantId);
        if (!deleted) {
            return res.status(404).json({ error: 'Device not found' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/:deviceId/zone', async (req, res) => {
    try {
        const updated = await deviceService.moveDeviceToZone(req.params.deviceId, req.body.zoneId);
        if (!updated) { return res.status(404).json({ error: 'Device not found' }); }
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ── Open door ─────────────────────────────────────────────────────────────────

// ── Intercom users (Hikvision ISAPI) ─────────────────────────────────────────
router.get('/:deviceId/users', async (req, res) => {
    try {
        const { status, body } = await deviceService.listIntercomUsers(req.params.deviceId);
        res.status(status).send(body);
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
router.post('/:deviceId/users', async (req, res) => {
    try {
        const data = await deviceService.createIntercomUser(req.params.deviceId, req.body);
        if (data.statusCode !== 1) { return res.status(400).json({ ok: false, error: data.errorMsg, detail: data }); }
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
router.put('/:deviceId/users/:employeeNo', async (req, res) => {
    try {
        const data = await deviceService.updateIntercomUser(req.params.deviceId, req.params.employeeNo, req.body);
        if (data.statusCode !== 1) { return res.status(400).json({ ok: false, error: data.errorMsg, detail: data }); }
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
router.delete('/:deviceId/users/:employeeNo', async (req, res) => {
    try {
        const data = await deviceService.deleteIntercomUser(req.params.deviceId, req.params.employeeNo);
        if (data.statusCode !== 1) { return res.status(400).json({ ok: false, error: data.errorMsg, detail: data }); }
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
// ── PIN codes ─────────────────────────────────────────────────────────────────
router.get('/:deviceId/pins', async (req, res) => {
    try {
        const result = await deviceService.listIntercomPins(req.params.deviceId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
router.get('/:deviceId/pins/:employeeNo', async (req, res) => {
    try {
        const result = await deviceService.getIntercomPin(req.params.deviceId, req.params.employeeNo);
        if (!result.ok) { return res.status(404).json(result); }
        res.json(result);
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
router.post('/:deviceId/pins', async (req, res) => {
    try {
        const { employeeNo, dynamicCode } = req.body;
        const data = await deviceService.setIntercomPin(req.params.deviceId, employeeNo, dynamicCode);
        if (data.statusCode !== 1) { return res.status(400).json({ ok: false, error: data.errorMsg, detail: data }); }
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
router.put('/:deviceId/pins/:employeeNo', async (req, res) => {
    try {
        const { dynamicCode } = req.body;
        const data = await deviceService.updateIntercomPin(req.params.deviceId, req.params.employeeNo, dynamicCode);
        if (data.statusCode !== 1) { return res.status(400).json({ ok: false, error: data.errorMsg, detail: data }); }
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
router.delete('/:deviceId/pins/:employeeNo', async (req, res) => {
    try {
        const data = await deviceService.deleteIntercomPin(req.params.deviceId, req.params.employeeNo);
        if (data.statusCode !== 1) { return res.status(400).json({ ok: false, error: data.errorMsg, detail: data }); }
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
// ── Cards ─────────────────────────────────────────────────────────────────────
router.get('/:deviceId/cards', async (req, res) => {
    try {
        const { status, body } = await deviceService.listCards(req.params.deviceId);
        res.status(status).send(body);
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
router.post('/:deviceId/cards', async (req, res) => {
    try {
        const { employeeNo, cardNo } = req.body;
        const data = await deviceService.assignCard(req.params.deviceId, employeeNo, cardNo);
        if (data.statusCode !== 1) { return res.status(400).json({ ok: false, error: data.errorMsg, detail: data }); }
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
router.put('/:deviceId/cards', async (req, res) => {
    try {
        const { employeeNo, cardNo } = req.body;
        const data = await deviceService.updateCard(req.params.deviceId, employeeNo, cardNo);
        if (data.statusCode !== 1) { return res.status(400).json({ ok: false, error: data.errorMsg, detail: data }); }
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
router.delete('/:deviceId/cards/:cardNo', async (req, res) => {
    try {
        const data = await deviceService.deleteCard(req.params.deviceId, req.params.cardNo);
        if (data.statusCode !== 1) { return res.status(400).json({ ok: false, error: data.errorMsg, detail: data }); }
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});


router.post('/test-sip', async (req, res) => {
    try {
        const { ip, port, username, password, roomNo, phoneNumber } = req.body;
        const DigestFetch = (await import('digest-fetch')).default;
        const client = new DigestFetch(username, password);
        const url = `http://${ip}:${port}/ISAPI/VideoIntercom/PhoneNumberRecords?format=json`;
        const body = JSON.stringify({
            PhoneNumberRecord: { roomNo, PhoneNumbers: [{ phoneNumber }] }
        });
        const response = await client.fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
        });
        const text = await response.text();
        res.status(response.status).send(text);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;