const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const DEVICES_FILE = path.join(__dirname, '../../data/devices.json');

function loadDevices() {
    return JSON.parse(
        fs.readFileSync(DEVICES_FILE, 'utf8')
    );
}
router.get('/intercoms', (req, res) => {
    const devices = loadDevices();
    const list = Object.entries(devices)
        .filter(([_, d]) => d.type === 'intercom')
        .map(([id, d]) => ({
            id,
            name: d.name,
            snapshot: d.snapshot,
            url: d.streamUrl
        }));
    res.json(list);
});
router.get('/cameras', (req, res) => {
    const devices = loadDevices();
    const list = Object.entries(devices)
        .filter(([_, d]) => d.type === 'camera')
        .map(([id, d]) => ({
            id,
            name: d.name,
            snapshot: d.snapshot,
            url: d.streamUrl
        }));
    res.json(list);
});
router.post('/open-door/:device', async (req, res) => {
    try {
        const deviceName = req.params.device;
        const devices = loadDevices();
        const INTERCOM = devices[deviceName];
        if (!INTERCOM) {
            return res.status(404).json({
                ok: false,
                error: 'Device not found',
            });
        }
        const DigestFetch = (await import('digest-fetch')).default;
        const client = new DigestFetch(
            INTERCOM.user,
            INTERCOM.pass
        );
        const path = `/ISAPI/AccessControl/RemoteControl/door/${INTERCOM.doorId}`;
        const url = `http://${INTERCOM.ip}:${INTERCOM.port}${path}`;
        const xml =
            `<?xml version="1.0" encoding="UTF-8"?>
                <RemoteControlDoor>
                    <cmd>open</cmd>
                </RemoteControlDoor>`;
        const response = await client.fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/xml', },
            body: xml,
        });
        const text = await response.text();
        if (response.ok) {
            return res.json({
                ok: true,
                message: 'Door opened',
            });
        }
        return res.status(500).json({
            ok: false,
            error: text,
        });
    } catch (error) {
        console.error('[INTERCOM ERROR]', error);
        return res.status(500).json({
            ok: false,
            error: error.message,
        });
    }
});
router.get('/:device/capabilities', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.device);
        const response = await client.fetch(`http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/capabilities`);
        const text = await response.text();
        res.status(response.status).send(text);
    } catch (error) {
        console.error('[INTERCOM CAPABILITIES]', error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});
router.get('/:device/user-capabilities', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.device);
        const response = await client.fetch(`http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/UserInfo/capabilities?format=json`);
        const text = await response.text();
        res.status(response.status).send(text);
    } catch (error) {
        console.error('[INTERCOM USER CAPABILITIES]', error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});
router.get('/:device/users/count', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.device);
        const response = await client.fetch(`http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/UserInfo/Count?format=json`);
        const text = await response.text();
        res.status(response.status).send(text);
    } catch (error) {
        console.error('[INTERCOM USERS COUNT]', error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

async function getIntercomClient(deviceName) {
    const devices = loadDevices();
    const intercom = devices[deviceName];
    if (!intercom) {
        throw new Error(`Device not found: ${deviceName}`);
    }
    const DigestFetch = (await import('digest-fetch')).default;
    return {
        intercom,
        client: new DigestFetch(
            intercom.user,
            intercom.pass
        )
    };
}

module.exports = router;