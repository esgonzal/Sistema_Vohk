const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const DEVICES_FILE = path.join(__dirname, '../../data/devices.json');
const FormData = require('form-data');

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
router.post('/:device/users/:employeeNo/face-test', async (req, res) => {
    try {
        const { intercom, client } = await getIntercomClient(req.params.device);
        const form = new FormData();
        const metadata = {
            faceLibType: 'blackFD',
            FDID: '1',
            FPID: req.params.employeeNo,
            name: `User ${req.params.employeeNo}`,
        };
        form.append(
            'faceURL',
            JSON.stringify(metadata),
            {
                contentType: 'application/json',
            }
        );
        form.append(
            'img',
            fs.createReadStream('../../test/face.jpg'),
            {
                filename: 'facePic.jpg',
                contentType: 'image/jpeg',
            }
        );
        const response = await client.fetch(
            `http://${intercom.ip}:${intercom.port}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json`,
            {
                method: 'POST',
                headers: form.getHeaders(),
                body: form,
            }
        );
        const text = await response.text();
        console.log(text);
        res.status(response.status).send(text);
    } catch (error) {
        console.error('[FACE TEST]', error);
        res.status(500).json({
            ok: false,
            error: error.message,
        });
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

module.exports = router;