const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const DEVICES_FILE = path.join(__dirname, '../../data/devices.json');
const INVITATIONS_FILE = path.join(__dirname, '../../data/invitations.json');
const FormData = require('form-data');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { v4: uuid } = require('uuid');
const FRONTEND_URL = "https://app.vohk.cl";

function loadDevices() {
    return JSON.parse(
        fs.readFileSync(DEVICES_FILE, 'utf8')
    );
}
function loadInvitations() {
    return JSON.parse(
        fs.readFileSync(INVITATIONS_FILE, 'utf8')
    );
}
function saveInvitations(invitations) {
    fs.writeFileSync(
        INVITATIONS_FILE,
        JSON.stringify(invitations, null, 2)
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
router.get('/:device/users', async (req, res) => {
    try {
        const { intercom, client } =
            await getIntercomClient(req.params.device);
        const body = {
            UserInfoSearchCond: {
                searchID: "1",
                searchResultPosition: 0,
                maxResults: 30
            }
        };
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/UserInfo/Search?format=json`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }
        );
        const text = await response.text();
        res.status(response.status).send(text);
    } catch (error) {
        console.error('[INTERCOM USERS]', error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});
router.put('/:device/users/:employeeNo', async (req, res) => {
    try {
        const { intercom, client } =
            await getIntercomClient(req.params.device);
        const { name, roomNumber, floorNumber = 1, } = req.body;
        const body = {
            UserInfo: {
                employeeNo: req.params.employeeNo,
                name,
                userType: 'normal',
                Valid: {
                    enable: true,
                    beginTime: '2000-01-01T00:00:00',
                    endTime: '2037-12-31T23:59:59',
                    timeType: 'local',
                },
                floorNumbers: [floorNumber],
                callNumbers: [`1-1-1-${roomNumber}`],
                roomNumber,
                floorNumber,
            },
        };
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/UserInfo/Modify?format=json`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );
        const text = await response.text();
        res.status(response.status).send(text);
    } catch (error) {
        console.error('[INTERCOM UPDATE USER]', error);
        res.status(500).json({
            ok: false,
            error: error.message,
        });
    }
});
router.delete('/:device/users/:employeeNo', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.device);
        const body = {
            UserInfoDelCond: {
                EmployeeNoList: [
                    {
                        employeeNo: req.params.employeeNo,
                    },
                ],
            },
        };
        console.log(
            'DELETE BODY:',
            JSON.stringify(body, null, 2)
        );
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/UserInfo/Delete?format=json`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );
        const text = await response.text();
        res.status(response.status).send(text);
    } catch (error) {
        console.error('[INTERCOM DELETE USER]', error);
        res.status(500).json({
            ok: false,
            error: error.message,
        });
    }
});
router.get('/:device/faces/capabilities', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.device);
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/Intelligent/FDLib/capabilities?format=json`
        );
        const text = await response.text();
        res.status(response.status).send(text);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});
router.get('/:device/faces/libraries', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.device);
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/Intelligent/FDLib?format=json`
        );
        const text = await response.text();
        res.status(response.status).send(text);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});
router.get('/:device/faces/count', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.device);
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/Intelligent/FDLib/Count?format=json`
        );
        const text = await response.text();
        res.status(response.status).send(text);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});
router.post('/:device/users/:employeeNo/face', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ ok: false, error: 'No image uploaded. Use field name "photo".' });
        const { intercom, client } = await getIntercomClient(req.params.device);
        const metadata = {
            faceLibType: 'blackFD',
            FDID: '1',
            FPID: req.params.employeeNo,
            name: req.body.name || `User ${req.params.employeeNo}`,
        };
        const { body, boundary } = buildFaceMultipart(metadata, req.file.buffer, req.file.mimetype);
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': body.length,
                },
                body,
            }
        );
        const data = await response.json();
        if (data.statusCode !== 1) return res.status(400).json({ ok: false, error: data.errorMsg, detail: data });
        console.log(data);
        res.json({ ok: true, FPID: data.FPID });
    } catch (error) {
        console.error('[FACE ADD]', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});
router.put('/:device/users/:employeeNo/face', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ ok: false, error: 'No image uploaded. Use field name "photo".' });
        const { intercom, client } = await getIntercomClient(req.params.device);
        const metadata = {
            faceLibType: 'blackFD',
            FDID: '1',
            FPID: req.params.employeeNo,
            name: req.body.name || `User ${req.params.employeeNo}`,
        };
        const { body, boundary } = buildFaceMultipart(metadata, req.file.buffer, req.file.mimetype);
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/Intelligent/FDLib/FDModify?format=json`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': body.length,
                },
                body,
            }
        );
        const data = await response.json();
        if (data.statusCode !== 1) return res.status(400).json({ ok: false, error: data.errorMsg, detail: data });
        res.json({ ok: true });
    } catch (error) {
        console.error('[FACE EDIT]', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});
router.delete('/:device/users/:employeeNo/face', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.device);
        const payload = JSON.stringify({
            FPID: [
                { value: req.params.employeeNo }
            ]
        });
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD`,
            {
                method: 'PUT',   // spec uses PUT, not DELETE
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                },
                body: payload,
            }
        );
        const data = await response.json();
        if (data.statusCode !== 1) return res.status(400).json({ ok: false, error: data.errorMsg, detail: data });
        res.json({ ok: true });
    } catch (error) {
        console.error('[FACE DELETE]', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});
router.post('/invitations', async (req, res) => {
    try {
        const invitations = loadInvitations();
        const invitation = {
            id: uuid(),
            residentEmployeeNo: req.body.residentEmployeeNo,
            beginTime: req.body.beginTime,
            endTime: req.body.endTime,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        invitations.push(invitation);
        saveInvitations(invitations);
        res.json({
            ok: true,
            invitation,
            url:
                `${FRONTEND_URL}/invite/${invitation.id}`
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});
router.get('/invitations/:id', (req, res) => {
    const invitations = loadInvitations();
    const invitation = invitations.find(i => i.id === req.params.id);
    if (!invitation) { return res.status(404).json({ ok: false }); }
    res.json(invitation);
});
router.post('/invitations/:id/register', upload.single('photo'), async (req, res) => {
    try {
        const invitations = loadInvitations();
        const invitation = invitations.find(x => x.id === req.params.id);
        if (!invitation) {
            return res.status(404).json({
                ok: false,
                error: 'Invitation not found'
            });
        }
        if (invitation.status !== 'pending') {
            return res.status(400).json({
                ok: false,
                error: 'Invitation already used'
            });
        }
        invitation.visitor = {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            vehiclePlate: req.body.vehiclePlate
        };
        const visitorResult = await createVisitorInIntercom('intercom_1', { name: req.body.name, beginTime: invitation.beginTime, endTime: invitation.endTime });
        if (!visitorResult || !visitorResult.employeeNo || !visitorResult.dynamicCode) {
            return res.status(500).json({ ok: false, error: 'Visitor created but response was incomplete' });
        }
        if (req.file) {
            console.log('Photo received:', req.file.originalname);
            await createFaceInIntercom('intercom_1', visitorResult.employeeNo, req.file, req.body.name);
        }
        invitation.employeeNo = visitorResult.employeeNo;
        invitation.dynamicCode = visitorResult.dynamicCode;
        invitation.status = 'registered';
        saveInvitations(invitations);
        return res.json({
            ok: true,
            employeeNo: visitorResult.employeeNo,
            dynamicCode: visitorResult.dynamicCode
        });
    } catch (error) {
        console.error('[INVITATION REGISTER]', error);
        return res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});


router.post('/:device/users/:employeeNo/qr', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.device);
        const payload = JSON.stringify({
            "QRCodeInfo": {
                "employeeNo": "9999",
                "valid": 43200,
                "times": 100
            }
        });
        console.log(payload);
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/QRCodeInfo?format=json`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                },
                body: payload,
            }
        );
        const text = await response.text();
        console.log('STATUS:', response.status);
        console.log('RESPONSE:', text);
        res.status(response.status).send(text);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            error: error.message,
        });
    }
});
router.post('/:device/visitors/qr', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.device);
        const dynamicCode = String(Math.floor(100000 + Math.random() * 900000));
        const employeeNo = '9999';
        const payload = JSON.stringify({
            UserInfo: {
                employeeNo,
                name: req.body.name || 'visitor',
                userType: 'visitor',
                Valid: {
                    enable: true,
                    beginTime: req.body.beginTime || '2026-01-01T00:00:00',
                    endTime: req.body.endTime || '2026-12-31T23:59:59',
                    timeType: 'local',
                },
                dynamicCode,
                floorNumber: req.body.floorNumber || 1,
                roomNumber: req.body.roomNumber || 1,
                doorRight: '1',
                userVerifyMode: 'cardOrPw',
            }
        });
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/UserInfo/Record?format=json`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                },
                body: payload,
            }
        );
        const data = await response.json();
        if (data.statusCode !== 1) return res.status(400).json({ ok: false, error: data.errorMsg, detail: data });
        res.json({ ok: true, employeeNo, dynamicCode });
    } catch (error) {
        console.error('[VISITOR QR]', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});
router.post('/:device/users/test', async (req, res) => {
    try {
        const { intercom, client } =
            await getIntercomClient(req.params.device);
        const body = {
            UserInfo: {
                employeeNo: "9999",
                name: "API_TEST",
                userType: "normal",
                Valid: {
                    enable: true,
                    beginTime: "2000-01-01T00:00:00",
                    endTime: "2037-12-31T23:59:59",
                    timeType: "local"
                },
                floorNumbers: [1],
                callNumbers: ["1-1-1-999"],
                roomNumber: 999,
                floorNumber: 1
            }
        };
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/UserInfo/Record?format=json`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }
        );
        const text = await response.text();
        res.status(response.status).send(text);
    } catch (error) {
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
            Valid: {
                enable: true,
                beginTime: visitorData.beginTime,
                endTime: visitorData.endTime,
                timeType: 'local'
            },
            dynamicCode,
            floorNumber: 1,
            roomNumber: 1,
            doorRight: '1',
            userVerifyMode: 'cardOrPw'
        }
    });
    const response = await client.fetch(
        `http://${intercom.ip}:${intercom.port}/ISAPI/AccessControl/UserInfo/Record?format=json`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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
    const { body, boundary } = buildFaceMultipart(metadata, file.buffer, file.mimetype);
    const response = await client.fetch(`http://${intercom.ip}:${intercom.port}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json`,
        {
            method: 'POST',
            headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length },
            body
        }
    );
    const data = await response.json();
    if (data.statusCode !== 1) { throw new Error(data.errorMsg || 'Face enrollment failed'); }
    return data;
}
module.exports = router;