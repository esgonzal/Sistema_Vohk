const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const multer = require('multer');
const { v4: uuid } = require('uuid');

const FRONTEND_URL = "https://app.vohk.cl";
const upload = multer({ storage: multer.memoryStorage() });

const deviceRepository = require('../../repositories/deviceRepository');
const invitationRepository = require('../../repositories/invitationRepository');
const visitorRepository = require('../../repositories/visitorRepository');

function formatCardForHikvision(cardNumber) { return cardNumber.padStart(10, '0'); }
async function getIntercomClient(deviceId) {
    const intercom = await deviceRepository.findIntercomByDeviceId(deviceId);
    if (!intercom) { throw new Error(`Device not found: ${deviceId}`); }
    const DigestFetch = (await import('digest-fetch')).default;
    return { intercom, client: new DigestFetch(intercom.username, intercom.password_encrypted) };
}
function buildFaceMultipart(metadata, imageBuffer, imageType = 'image/jpeg') {
    const boundary = '----HikvisionBoundary' + Date.now();
    const CRLF = '\r\n';
    const json = JSON.stringify(metadata);
    const jsonPart = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="faceURL"`,
        `Content-Type: application/json`,
        `Content-Length: ${Buffer.byteLength(json)}`,
        '',
        json,
    ].join(CRLF);
    const imgHeader = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="img"; filename="facePic.jpg"`,
        `Content-Type: ${imageType}`,
        `Content-Length: ${imageBuffer.length}`,
        '',
        '',
    ].join(CRLF);
    const body = Buffer.concat([
        Buffer.from(jsonPart + CRLF),
        Buffer.from(imgHeader),
        imageBuffer,
        Buffer.from(`${CRLF}--${boundary}--${CRLF}`),
    ]);
    return { body, boundary };
}
async function createVisitorInIntercom(device, visitorData) {
    const { intercom, client } = await getIntercomClient(device);
    const dynamicCode = String(Math.floor(100000 + Math.random() * 900000));
    const employeeNo = String(Date.now());
    const payload = JSON.stringify({
        UserInfo: {
            employeeNo,
            name: visitorData.name,
            userType: 'visitor',
            Valid: { enable: true, beginTime: formatHikvisionTime(visitorData.beginTime), endTime: formatHikvisionTime(visitorData.endTime), timeType: 'local' },
            dynamicCode,
            doorRight: '1',
            userVerifyMode: 'cardOrPw'
        }
    });
    const response = await client.fetch(`http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/UserInfo/Record?format=json`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload
        }
    );
    console.log("PAYLOAD: ", payload);
    console.log("RESPONSE: ", response);
    const data = await response.json();
    if (data.statusCode !== 1) { throw new Error(data.errorMsg || 'Intercom error'); }
    return { employeeNo, dynamicCode };
}
async function createFaceInIntercom(device, employeeNo, file, name) {
    const { intercom, client } = await getIntercomClient(device);
    const metadata = { faceLibType: 'blackFD', FDID: '1', FPID: employeeNo, name };
    const meta = await sharp(file.buffer).metadata();
    console.log('INPUT IMAGE:', meta);
    if (!meta.width || !meta.height) { throw new Error('Invalid image'); }
    const processedBuffer = await sharp(file.buffer).rotate().resize(600, 600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 75, mozjpeg: true }).toBuffer();
    const { body, boundary } = buildFaceMultipart(metadata, processedBuffer, 'image/jpeg');
    const response = await client.fetch(`http://${intercom.ip_address}:${intercom.port}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json`,
        {
            method: 'POST',
            headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length },
            body
        }
    );
    const text = await response.text();
    const data = JSON.parse(text);
    console.log('HIKVISION RESPONSE:', data);
    if (data.statusCode !== 1) { throw new Error(data.errorMsg || 'Face enrollment failed'); }
    return data;
}
function formatHikvisionTime(date) {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    return (
        d.getFullYear() + '-' +
        pad(d.getMonth() + 1) + '-' +
        pad(d.getDate()) + 'T' +
        pad(d.getHours()) + ':' +
        pad(d.getMinutes()) + ':' +
        pad(d.getSeconds())
    );
}

// ── Device listing ────────────────────────────────────────────────────────────

// List all intercoms
router.get('/intercoms', async (req, res) => {
    try {
        const intercoms = await deviceRepository.findIntercoms();
        console.log(intercoms);
        res.json(
            intercoms.map(device => ({
                id: device.device_id,
                name: device.name,
                snapshot: device.snapshot_url,
                url: device.stream_url
            }))
        );
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
// List all cameras
router.get('/cameras', async (req, res) => {
    try {
        const cameras = await deviceRepository.findCameras();
        res.json(
            cameras.map(device => ({
                id: device.device_id,
                name: device.name,
                snapshot: device.snapshot_url,
                url: device.stream_url
            }))
        );
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Device management ─────────────────────────────────────────────────────────

// Get all devices in a condominium, optionally filtered by zoneId
// GET /device/location?condominiumId=...&zoneId=...
router.get('/location', async (req, res) => {
    try {
        const { condominiumId, zoneId } = req.query;
        const devices = await deviceRepository.findDevicesByCondominium(condominiumId, zoneId || null);
        res.json(devices);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
// Get all devices in a specific zone
// GET /device/zone/:zoneId
router.get('/zone/:zoneId', async (req, res) => {
    try {
        const devices = await deviceRepository.findDevicesByZone(req.params.zoneId);
        res.json(devices);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
// Add device to a zone
router.post('/', async (req, res) => {
    try {
        const { deviceData, intercomData } = req.body;
        console.log("BODY: ", req.body);
        const created = await deviceRepository.createDevice(deviceData, intercomData);
        res.status(201).json(created);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
// Update device
router.put('/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { deviceData, intercomData } = req.body;
        const updatedDevice = await deviceRepository.updateDevice(
            deviceId, deviceData.name, deviceData.ipAddress,
            deviceData.port, deviceData.snapshotUrl, deviceData.streamUrl, deviceData.active
        );
        if (!updatedDevice) {
            return res.status(404).json({ error: 'Device not found' });
        }
        if (updatedDevice.type === 'intercom' && intercomData) {
            await deviceRepository.updateIntercom(deviceId, intercomData.sipAddress, intercomData.username, intercomData.passwordEncrypted, intercomData.doorId);
        }
        res.json(updatedDevice);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
// Delete device
router.delete('/:deviceId', async (req, res) => {
    try {
        const deleted = await deviceRepository.deleteDevice(req.params.deviceId);
        if (!deleted) {
            return res.status(404).json({ error: 'Device not found' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
// Move device to a different zone
// PUT /device/:deviceId/zone
router.put('/:deviceId/zone', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { zoneId } = req.body;
        const updated = await deviceRepository.moveDeviceToZone(deviceId, zoneId);
        if (!updated) { return res.status(404).json({ error: 'Device not found' }); }
        res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
// Open the door of an intercom remotely
router.post('/open-door/:deviceId', async (req, res) => {
    try {
        const deviceId = req.params.deviceId;
        const intercom = await deviceRepository.findIntercomByDeviceId(deviceId);
        if (!intercom) { return res.status(404).json({ ok: false, error: 'Device not found' }); }
        const DigestFetch = (await import('digest-fetch')).default;
        const client = new DigestFetch(intercom.username, intercom.password_encrypted);
        const path = `/ISAPI/AccessControl/RemoteControl/door/${intercom.door_id}`;
        const url = `http://${intercom.ip_address}:${intercom.port}${path}`;
        const xml =
            `<?xml version="1.0" encoding="UTF-8"?>
                <RemoteControlDoor>
                    <cmd>open</cmd>
                </RemoteControlDoor>`;
        const response = await client.fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/xml' }, body: xml });
        const text = await response.text();
        console.log('Opening door', intercom.name, intercom.ip_address);
        if (response.ok) { return res.json({ ok: true, message: 'Door opened' }); }
        return res.status(500).json({ ok: false, error: text });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// ── Intercom users (Hikvision ISAPI) ─────────────────────────────────────────

// List all residents of the intercom
router.get('/:deviceId/users', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.deviceId);
        const response = await client.fetch(
            `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/UserInfo/Search?format=json`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ UserInfoSearchCond: { searchID: '1', searchResultPosition: 0, maxResults: 30 } }),
            }
        );
        res.status(response.status).send(await response.text());
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
// Create a new resident for the intercom
router.post('/:deviceId/users', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.deviceId);
        const { employeeNo, name, roomNumber, floorNumber = 1 } = req.body;
        console.log(req.body);
        const payload = {
            UserInfo: {
                employeeNo, name, userType: 'normal',
                Valid: { enable: true, beginTime: '2000-01-01T00:00:00', endTime: '2037-12-31T23:59:59', timeType: 'local' },
                floorNumbers: [floorNumber], callNumbers: [`${roomNumber}`], roomNumber, floorNumber,
            }
        };
        const response = await client.fetch(
            `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/UserInfo/Record?format=json`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        );
        const data = await response.json();
        if (data.statusCode !== 1) return res.status(400).json({ ok: false, error: data.errorMsg, detail: data });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
// Edit a resident in the intercom
router.put('/:deviceId/users/:employeeNo', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.deviceId);
        const { name, roomNumber, floorNumber = 1 } = req.body;
        const payload = {
            UserInfo: {
                employeeNo: req.params.employeeNo, name, userType: 'normal',
                Valid: { enable: true, beginTime: '2000-01-01T00:00:00', endTime: '2037-12-31T23:59:59', timeType: 'local' },
                floorNumbers: [floorNumber], callNumbers: [`1-1-1-${roomNumber}`], roomNumber, floorNumber,
            }
        };
        const response = await client.fetch(
            `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/UserInfo/Modify?format=json`,
            { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        );
        const data = await response.json();
        if (data.statusCode !== 1) return res.status(400).json({ ok: false, error: data.errorMsg, detail: data });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
// Delete a resident from the intercom
router.delete('/:deviceId/users/:employeeNo', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.deviceId);
        const payload = { UserInfoDelCond: { EmployeeNoList: [{ employeeNo: req.params.employeeNo }] } };
        const response = await client.fetch(
            `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/UserInfo/Delete?format=json`,
            { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        );
        const data = await response.json();
        if (data.statusCode !== 1) return res.status(400).json({ ok: false, error: data.errorMsg, detail: data });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// ── Face enrollment ───────────────────────────────────────────────────────────

// Enroll a face photo
router.post('/:deviceId/users/:employeeNo/face', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ ok: false, error: 'No image uploaded. Use field name "photo".' });
        const { intercom, client } = await getIntercomClient(req.params.deviceId);
        const processedBuffer = await processImageForIntercom(req.file);
        const metadata = {
            faceLibType: 'blackFD', FDID: '1',
            FPID: req.params.employeeNo,
            name: req.body.name || `User ${req.params.employeeNo}`,
        };
        const { body, boundary } = buildFaceMultipart(metadata, processedBuffer, 'image/jpeg');
        const response = await client.fetch(
            `http://${intercom.ip_address}:${intercom.port}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json`,
            { method: 'POST', headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length }, body }
        );
        const data = await response.json();
        if (data.statusCode !== 1) return res.status(400).json({ ok: false, error: data.errorMsg, detail: data });
        res.json({ ok: true, FPID: data.FPID });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
// Edit a face photo
router.put('/:deviceId/users/:employeeNo/face', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ ok: false, error: 'No image uploaded. Use field name "photo".' });
        const { intercom, client } = await getIntercomClient(req.params.deviceId);
        const processedBuffer = await processImageForIntercom(req.file);
        const metadata = {
            faceLibType: 'blackFD', FDID: '1',
            FPID: req.params.employeeNo,
            name: req.body.name || `User ${req.params.employeeNo}`,
        };
        const { body, boundary } = buildFaceMultipart(metadata, processedBuffer, 'image/jpeg');
        const response = await client.fetch(
            `http://${intercom.ip_address}:${intercom.port}/ISAPI/Intelligent/FDLib/FDModify?format=json`,
            { method: 'PUT', headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length }, body }
        );
        const data = await response.json();
        if (data.statusCode !== 1) return res.status(400).json({ ok: false, error: data.errorMsg, detail: data });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
// Delete a face photo
router.delete('/:deviceId/users/:employeeNo/face', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.deviceId);
        const payload = JSON.stringify({ FPID: [{ value: req.params.employeeNo }] });
        const response = await client.fetch(
            `http://${intercom.ip_address}:${intercom.port}/ISAPI/Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD`,
            { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }, body: payload }
        );
        const data = await response.json();
        if (data.statusCode !== 1) return res.status(400).json({ ok: false, error: data.errorMsg, detail: data });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// ── Cards ─────────────────────────────────────────────────────────────────────

// List all cards of the intercom
router.get('/:deviceId/cards', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.deviceId);
        const payload = { CardInfoSearchCond: { searchID: '1', searchResultPosition: 0, maxResults: 30 } };
        const response = await client.fetch(
            `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/CardInfo/Search?format=json`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        );
        res.status(response.status).send(await response.text());
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
// Assign a card to a resident
router.post('/:deviceId/cards', async (req, res) => {
    try {
        const { employeeNo, cardNo } = req.body;
        const { intercom, client } = await getIntercomClient(req.params.deviceId);
        const payload = { CardInfo: { employeeNo, cardNo: formatCardForHikvision(cardNo), cardType: 'normalCard' } };
        const response = await client.fetch(
            `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/CardInfo/Record?format=json`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        );
        const data = await response.json();
        if (data.statusCode !== 1) return res.status(400).json({ ok: false, error: data.errorMsg, detail: data });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
// Edit a card assignment
router.put('/:deviceId/cards', async (req, res) => {
    try {
        const { employeeNo, cardNo } = req.body;
        const { intercom, client } = await getIntercomClient(req.params.deviceId);
        const payload = { CardInfo: { employeeNo, cardNo: formatCardForHikvision(cardNo), cardType: 'normalCard' } };
        const response = await client.fetch(
            `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/CardInfo/Modify?format=json`,
            { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        );
        const data = await response.json();
        if (data.statusCode !== 1) return res.status(400).json({ ok: false, error: data.errorMsg, detail: data });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
// Delete a card
router.delete('/:deviceId/cards/:cardNo', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.deviceId);
        const payload = { CardInfoDelCond: { CardNoList: [{ cardNo: formatCardForHikvision(req.params.cardNo) }] } };
        const response = await client.fetch(
            `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/CardInfo/Delete?format=json`,
            { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        );
        const data = await response.json();
        if (data.statusCode !== 1) return res.status(400).json({ ok: false, error: data.errorMsg, detail: data });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// ── Invitations ───────────────────────────────────────────────────────────────

// List all invitations
router.get('/invitations', async (req, res) => {
    try {
        const invitations = await invitationRepository.findAll();
        console.log("En all invitations", invitations);
        res.json(invitations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Get a specific invitation
router.get('/invitations/:id', async (req, res) => {
    try {
        const invitation = await invitationRepository.findById(req.params.id);
        console.log("En una invitation", invitation);
        if (!invitation) { return res.status(404).json({ ok: false, error: 'Not found' }); }
        res.json(invitation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Create a new invitation
router.post('/invitations', async (req, res) => {
    try {
        const { unitId, createdByUserId, validFrom, validUntil, type, deviceIds } = req.body;
        console.log("En nueva invitacion", req.body);
        const invitation = await invitationRepository.create({ unitId, createdByUserId, validFrom, validUntil, type });
        if (Array.isArray(deviceIds) && deviceIds.length > 0) {
            await Promise.all(
                deviceIds.map(deviceId =>
                    invitationRepository.assignDevice(invitation.invitation_id, deviceId)
                )
            );
        }
        res.json({ ok: true, invitation, url: `${FRONTEND_URL}/invite/${invitation.invitation_id}` });
    } catch (err) {
        console.log(err);
        res.status(500).json({ ok: false, error: err.message });
    }
});
// Register visitor data into an invitation, creating them in the intercom
router.post('/invitations/:id/register', upload.single('photo'), async (req, res) => {
    try {
        const invitation = await invitationRepository.findById(req.params.id);
        console.log("En registrar invitation", invitation);
        if (!invitation) { return res.status(404).json({ ok: false, error: 'Invitation not found' }); }
        if (invitation.status !== 'pending') { return res.status(400).json({ ok: false, error: 'Invitation already used' }); }
        const intercomDevice = await invitationRepository.findFirstIntercom(invitation.invitation_id);
        if (!intercomDevice) { return res.status(400).json({ ok: false, error: 'No intercom linked to this invitation' }); }
        const visitorResult = await createVisitorInIntercom(intercomDevice.device_id, {
            name: req.body.name,
            beginTime: invitation.valid_from,
            endTime: invitation.valid_until,
        });
        if (req.file) {
            await createFaceInIntercom(intercomDevice.device_id, visitorResult.employeeNo, req.file, req.body.name);
        }
        const visitor = await visitorRepository.createVisitor(req.body.name, req.body.email, req.body.phone, req.body.vehiclePlate);
        await invitationRepository.registerVisitor(invitation.invitation_id, visitor.visitor_id, visitorResult.employeeNo, visitorResult.dynamicCode);
        return res.json({ ok: true, dynamicCode: visitorResult.dynamicCode });
    } catch (error) {
        console.error('[INVITATION REGISTER ERROR]', error);
        return res.status(500).json({ ok: false, error: error.message });
    }
});
// Delete an invitation, also removes visitor from intercom if registered
router.delete('/invitations/:id', async (req, res) => {
    try {
        const invitation = await invitationRepository.findById(req.params.id);
        if (!invitation) { return res.status(404).json({ ok: false, error: 'Not found' }); }
        if (invitation.hikvision_employee_no) {
            try {
                const intercomDevice = await invitationRepository.findFirstIntercom(invitation.invitation_id);
                if (intercomDevice) {
                    const { intercom, client } = await getIntercomClient(intercomDevice.device_id);
                    const payload = JSON.stringify({ UserInfoDelCond: { EmployeeNoList: [{ employeeNo: invitation.hikvision_employee_no }] } });
                    await client.fetch(
                        `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/UserInfo/Delete?format=json`,
                        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: payload }
                    );
                }
            } catch (e) { console.error('[DELETE VISITOR FROM INTERCOM]', e.message); }
        }
        await invitationRepository.deleteInvitation(invitation.invitation_id);
        if (invitation.visitor_id) {
            await visitorRepository.deleteVisitor(invitation.visitor_id);
        }
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

module.exports = router;