const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const multer = require('multer');
const { v4: uuid } = require('uuid');

const DEVICES_FILE = path.join(__dirname, '../../data/devices.json');
const INVITATIONS_FILE = path.join(__dirname, '../../data/invitations.json');
const FRONTEND_URL = "https://app.vohk.cl";
const upload = multer({ storage: multer.memoryStorage() });

function loadDevices() { return JSON.parse(fs.readFileSync(DEVICES_FILE, 'utf8')); }
function loadInvitations() { return JSON.parse(fs.readFileSync(INVITATIONS_FILE, 'utf8')); }
function saveInvitations(invitations) { fs.writeFileSync(INVITATIONS_FILE, JSON.stringify(invitations, null, 2)); }
function formatCardForHikvision(cardNumber) { return cardNumber.padStart(10, '0'); }
async function getIntercomClient(deviceName) {
    const devices = loadDevices();
    const intercom = devices[deviceName];
    if (!intercom) { throw new Error(`Device not found: ${deviceName}`); }
    const DigestFetch = (await import('digest-fetch')).default;
    return {
        intercom,
        client: new DigestFetch(intercom.user, intercom.pass)
    };
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
            Valid: { enable: true, beginTime: visitorData.beginTime, endTime: visitorData.endTime, timeType: 'local' },
            dynamicCode,
            doorRight: '1',
            userVerifyMode: 'cardOrPw'
        }
    });
    const response = await client.fetch(`http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/UserInfo/Record?format=json`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload
        }
    );
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
    const response = await client.fetch(`http://${intercom.ip}:${intercom.port}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json`,
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
// List all intercoms
router.get('/intercoms', (req, res) => {
    const devices = loadDevices();
    res.json(
        Object.entries(devices)
            .filter(([_, d]) => d.type === 'intercom')
            .map(([id, d]) => ({ id, name: d.name, snapshot: d.snapshot, url: d.streamUrl }))
    );
});
// List all cameras
router.get('/cameras', (req, res) => {
    const devices = loadDevices();
    res.json(
        Object.entries(devices)
            .filter(([_, d]) => d.type === 'camera')
            .map(([id, d]) => ({ id, name: d.name, snapshot: d.snapshot, url: d.streamUrl }))
    );
});
// Open the door of an intercom remotely
router.post('/open-door/:device', async (req, res) => {
    try {
        const deviceName = req.params.device;
        const devices = loadDevices();
        const INTERCOM = devices[deviceName];
        if (!INTERCOM) { return res.status(404).json({ ok: false, error: 'Device not found', }); }
        const DigestFetch = (await import('digest-fetch')).default;
        const client = new DigestFetch(INTERCOM.user, INTERCOM.pass);
        const path = `/ISAPI/AccessControl/RemoteControl/door/${INTERCOM.doorId}`;
        const url = `http://${INTERCOM.ip}:${INTERCOM.port}${path}`;
        const xml =
            `<?xml version="1.0" encoding="UTF-8"?>
                <RemoteControlDoor>
                    <cmd>open</cmd>
                </RemoteControlDoor>`;
        const response = await client.fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/xml', }, body: xml, });
        const text = await response.text();
        if (response.ok) { return res.json({ ok: true, message: 'Door opened', }); }
        return res.status(500).json({ ok: false, error: text, });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
//  RESIDENTS
// List all residents of the intercom
router.get('/:device/users', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.device);
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/UserInfo/Search?format=json`,
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
router.post('/:device/users', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.device);
        const { employeeNo, name, roomNumber, floorNumber = 1 } = req.body;
        const payload = {
            UserInfo: {
                employeeNo,
                name,
                userType: 'normal',
                Valid: { enable: true, beginTime: '2000-01-01T00:00:00', endTime: '2037-12-31T23:59:59', timeType: 'local' },
                floorNumbers: [floorNumber],
                callNumbers: [`1-1-1-${roomNumber}`],
                roomNumber,
                floorNumber,
            }
        };
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/UserInfo/Record?format=json`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        );
        const data = await response.json();
        if (data.statusCode !== 1) return res.status(400).json({ ok: false, error: data.errorMsg, detail: data });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
// Edit a resident from the intercom
router.put('/:device/users/:employeeNo', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.device);
        const { name, roomNumber, floorNumber = 1, } = req.body;
        const payload = {
            UserInfo: {
                employeeNo: req.params.employeeNo,
                name,
                userType: 'normal',
                Valid: { enable: true, beginTime: '2000-01-01T00:00:00', endTime: '2037-12-31T23:59:59', timeType: 'local' },
                floorNumbers: [floorNumber],
                callNumbers: [`1-1-1-${roomNumber}`],
                roomNumber,
                floorNumber,
            }
        };
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/UserInfo/Modify?format=json`,
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
router.delete('/:device/users/:employeeNo', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.device);
        const payload = { UserInfoDelCond: { EmployeeNoList: [{ employeeNo: req.params.employeeNo }] } };
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/UserInfo/Delete?format=json`,
            { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        );
        const data = await response.json();
        if (data.statusCode !== 1) return res.status(400).json({ ok: false, error: data.errorMsg, detail: data });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
//  FACE ID
// Enroll a face photo
router.post('/:device/users/:employeeNo/face', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ ok: false, error: 'No image uploaded. Use field name "photo".' });
        const { intercom, client } = await getIntercomClient(req.params.device);
        const processedBuffer = await processImageForIntercom(req.file);
        const metadata = {
            faceLibType: 'blackFD', FDID: '1',
            FPID: req.params.employeeNo,
            name: req.body.name || `User ${req.params.employeeNo}`,
        };
        const { body, boundary } = buildFaceMultipart(metadata, processedBuffer, 'image/jpeg');
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json`,
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
router.put('/:device/users/:employeeNo/face', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ ok: false, error: 'No image uploaded. Use field name "photo".' });
        const { intercom, client } = await getIntercomClient(req.params.device);
        const processedBuffer = await processImageForIntercom(req.file);
        const metadata = {
            faceLibType: 'blackFD', FDID: '1',
            FPID: req.params.employeeNo,
            name: req.body.name || `User ${req.params.employeeNo}`,
        };
        const { body, boundary } = buildFaceMultipart(metadata, processedBuffer, 'image/jpeg');
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/Intelligent/FDLib/FDModify?format=json`,
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
router.delete('/:device/users/:employeeNo/face', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.device);
        const payload = JSON.stringify({ FPID: [{ value: req.params.employeeNo }] });
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD`,
            { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }, body: payload }
        );
        const data = await response.json();
        if (data.statusCode !== 1) return res.status(400).json({ ok: false, error: data.errorMsg, detail: data });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
//  CARD
// List all cards of the intercom
router.get('/:device/cards', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.device);
        const payload = { CardInfoSearchCond: { searchID: '1', searchResultPosition: 0, maxResults: 30 } };
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/CardInfo/Search?format=json`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        );
        res.status(response.status).send(await response.text());
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
// Assign a card to a resident
router.post('/:device/cards', async (req, res) => {
    try {
        const { employeeNo, cardNo } = req.body;
        const { intercom, client } = await getIntercomClient(req.params.device);
        const payload = { CardInfo: { employeeNo, cardNo: formatCardNo(cardNo), cardType: 'normalCard' } };
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/CardInfo/Record?format=json`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        );
        const data = await response.json();
        if (data.statusCode !== 1) return res.status(400).json({ ok: false, error: data.errorMsg, detail: data });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
// Edit a card of a resident
router.put('/:device/cards', async (req, res) => {
    try {
        const { employeeNo, cardNo } = req.body;
        const { intercom, client } = await getIntercomClient(req.params.device);
        const payload = { CardInfo: { employeeNo, cardNo: formatCardNo(cardNo), cardType: 'normalCard' } };
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/CardInfo/Modify?format=json`,
            { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        );
        const data = await response.json();
        if (data.statusCode !== 1) return res.status(400).json({ ok: false, error: data.errorMsg, detail: data });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
// Delete a card of a resident
router.delete('/:device/cards/:cardNo', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.device);
        const payload = { CardInfoDelCond: { CardNoList: [{ cardNo: formatCardNo(req.params.cardNo) }] } };
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/CardInfo/Delete?format=json`,
            { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        );
        const data = await response.json();
        if (data.statusCode !== 1) return res.status(400).json({ ok: false, error: data.errorMsg, detail: data });
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
//  INVITATIONS
// List all invitations
router.get('/invitations', (req, res) => {
    const invitations = loadInvitations();
    const { residentEmployeeNo } = req.query;
    res.json(residentEmployeeNo
        ? invitations.filter(i => i.residentEmployeeNo === residentEmployeeNo)
        : invitations
    );
});
// Get a specific invitation
router.get('/invitations/:id', (req, res) => {
    const invitation = loadInvitations().find(i => i.id === req.params.id);
    if (!invitation) return res.status(404).json({ ok: false, error: 'Not found' });
    res.json(invitation);
});
// Create a new invitation, its empty until the visitor registers with it
router.post('/invitations', (req, res) => {
    try {
        const invitations = loadInvitations();
        const invitation = {
            id: uuid(),
            residentEmployeeNo: req.body.residentEmployeeNo,
            beginTime: req.body.beginTime,
            endTime: req.body.endTime,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        invitations.push(invitation);
        saveInvitations(invitations);
        res.json({ ok: true, invitation, url: `${FRONTEND_URL}/invite/${invitation.id}` });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
// Register the invitation with the visitor data, creating the visitor in the intercom and enrolling their face if a photo was sent
router.post('/invitations/:id/register', upload.single('photo'), async (req, res) => {
    try {
        const invitations = loadInvitations();
        const invitation = invitations.find(x => x.id === req.params.id);
        if (!invitation) return res.status(404).json({ ok: false, error: 'Invitation not found' });
        if (invitation.status !== 'pending') return res.status(400).json({ ok: false, error: 'Invitation already used' });
        invitation.visitor = {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            vehiclePlate: req.body.vehiclePlate,
        };
        const visitorResult = await createVisitorInIntercom('intercom_1', {
            name: req.body.name,
            beginTime: invitation.beginTime,
            endTime: invitation.endTime,
        });
        if (req.file) { await createFaceInIntercom('intercom_1', visitorResult.employeeNo, req.file, req.body.name); }
        invitation.employeeNo = visitorResult.employeeNo;
        invitation.dynamicCode = visitorResult.dynamicCode;
        invitation.status = 'registered';
        saveInvitations(invitations);
        return res.json({ ok: true, dynamicCode: visitorResult.dynamicCode });
    } catch (error) {
        console.error('[INVITATION REGISTER ERROR]', error);
        return res.status(500).json({ ok: false, error: error.message });
    }
});
// Delete an invitation, also deletes the visitor from the intercom if it was already registered
router.delete('/invitations/:id', async (req, res) => {
    try {
        const invitations = loadInvitations();
        const index = invitations.findIndex(i => i.id === req.params.id);
        if (index === -1) return res.status(404).json({ ok: false, error: 'Not found' });
        const invitation = invitations[index];
        if (invitation.employeeNo) {
            try {
                const { intercom, client } = await getIntercomClient('intercom_1');
                const payload = JSON.stringify({ UserInfoDelCond: { EmployeeNoList: [{ employeeNo: invitation.employeeNo }] } });
                await client.fetch(
                    `http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/UserInfo/Delete?format=json`,
                    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: payload }
                );
            } catch (e) {
                console.error('[DELETE VISITOR FROM INTERCOM]', e.message);
            }
        }
        invitations.splice(index, 1);
        saveInvitations(invitations);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

module.exports = router;