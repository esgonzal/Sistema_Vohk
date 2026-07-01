const sharp = require('sharp');
const { v4: uuid } = require('uuid');
const FRONTEND_URL = "https://app.vohk.cl";
const deviceRepository = require('../../repositories/deviceRepository');
const invitationRepository = require('../../repositories/invitationRepository');
const visitorRepository = require('../../repositories/visitorRepository');
const intercomUserRepository = require('../../repositories/intercomUserRepository');
const zoneRepository = require('../../repositories/zoneRepository');
const intercomRepository = require('../../repositories/intercomRepository');

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCardForHikvision(cardNumber) {
    return cardNumber.padStart(10, '0');
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
async function processImageForIntercom(file) {
    const meta = await sharp(file.buffer).metadata();
    if (!meta.width || !meta.height) { throw new Error('Invalid image'); }
    return sharp(file.buffer)
        .rotate()
        .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 75, mozjpeg: true })
        .toBuffer();
}
// ── Device listing ────────────────────────────────────────────────────────────
async function listIntercoms() {
    const intercoms = await deviceRepository.findIntercoms();
    return intercoms.map(device => ({
        id: device.device_id,
        name: device.name,
        snapshot: device.snapshot_url,
        url: device.stream_url,
    }));
}
async function listCameras() {
    const cameras = await deviceRepository.findCameras();
    return cameras.map(device => ({
        id: device.device_id,
        name: device.name,
        snapshot: device.snapshot_url,
        url: device.stream_url,
    }));
}
// ── Device management ─────────────────────────────────────────────────────────
async function getDevicesByCondominium(condominiumId, tenantId, zoneId = null) {
    return deviceRepository.findDevicesByCondominium(condominiumId, tenantId, zoneId);
}
async function getDevicesByZone(zoneId) {
    return deviceRepository.findDevicesByZone(zoneId);
}
async function createDevice(deviceData, intercomData, tenantId) {
    const zone = await zoneRepository.findZoneByIdAndTenant(deviceData.zoneId, tenantId);
    if (!zone) {
        throw new Error('Zone not found');
    }
    const device = await deviceRepository.createDevice(deviceData.zoneId, deviceData.type, deviceData.name, deviceData.ipAddress, deviceData.port, deviceData.snapshotUrl, deviceData.streamUrl, deviceData.active ?? true);
    if (intercomData) {
        await intercomRepository.createIntercom(device.device_id, intercomData.sipAddress, intercomData.username, intercomData.passwordEncrypted, intercomData.doorId
        );
    }
    return device;
}
async function updateDevice(deviceId, tenantId, deviceData, intercomData) {
    const device = await deviceRepository.findDeviceByIdAndTenant(deviceId, tenantId);
    if (!device) {
        throw new Error('Device not found');
    }
    const zone = await zoneRepository.findZoneByIdAndTenant(deviceData.zoneId, tenantId);
    if (!zone) {
        throw new Error('Zone not found');
    }
    const updatedDevice = await deviceRepository.updateDevice(deviceId, deviceData.zoneId, deviceData.name, deviceData.ipAddress, deviceData.port, deviceData.snapshotUrl, deviceData.streamUrl, deviceData.active);
    if (!updatedDevice) { return null; }
    if (updatedDevice.type === 'intercom' && intercomData) {
        await intercomRepository.updateIntercom(deviceId, intercomData.sipAddress, intercomData.username, intercomData.passwordEncrypted, intercomData.doorId,);
    }
    return updatedDevice;
}
async function deleteDevice(deviceId, tenantId) {
    const device = await deviceRepository.findDeviceByIdAndTenant(deviceId, tenantId);
    if (!device) {
        return null;
    }
    return deviceRepository.deleteDevice(deviceId);
}
async function moveDeviceToZone(deviceId, zoneId) {
    return deviceRepository.moveDeviceToZone(deviceId, zoneId);
}
// ── Open door ─────────────────────────────────────────────────────────────────
async function openDoor(deviceId) {
    const intercom = await deviceRepository.findIntercomByDeviceId(deviceId);
    if (!intercom) { return null; }
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
    return { ok: response.ok, text, intercomName: intercom.name };
}
// ── Intercom users (Hikvision ISAPI) ─────────────────────────────────────────
async function listIntercomUsers(deviceId) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/UserInfo/Search?format=json`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ UserInfoSearchCond: { searchID: '1', searchResultPosition: 0, maxResults: 30 } }),
        },
    );
    return { status: response.status, body: await response.text() };
}
async function createIntercomUser(deviceId, { employeeNo, dynamicCode, name, roomNumber, floorNumber = 1, }) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const payload = {
        UserInfo: {
            employeeNo, dynamicCode, name, userType: 'normal',
            Valid: { enable: true, beginTime: '2000-01-01T00:00:00', endTime: '2037-12-31T23:59:59', timeType: 'local' },
            floorNumbers: [floorNumber], callNumbers: [`${roomNumber}`], roomNumber, floorNumber,
        },
    };
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/UserInfo/Record?format=json`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    );
    const data = await response.json();
    if (data.statusCode !== 1) {
        return { ok: false, error: data.errorMsg, raw: data };
    }
    return { ok: true, data };
}
async function updateIntercomUser(deviceId, employeeNo, { name, roomNumber, floorNumber = 1 }) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const payload = {
        UserInfo: {
            employeeNo, name, userType: 'normal',
            Valid: { enable: true, beginTime: '2000-01-01T00:00:00', endTime: '2037-12-31T23:59:59', timeType: 'local' },
            floorNumbers: [floorNumber], callNumbers: [`1-1-1-${roomNumber}`], roomNumber, floorNumber,
        },
    };
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/UserInfo/Modify?format=json`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    );
    return response.json();
}
async function deleteIntercomUser(deviceId, employeeNo) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const payload = { UserInfoDelCond: { EmployeeNoList: [{ employeeNo }] } };
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/UserInfo/Delete?format=json`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    );
    return response.json();
}
// ── Face enrollment ───────────────────────────────────────────────────────────
async function enrollFace(deviceId, employeeNo, file, name) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const processedBuffer = await processImageForIntercom(file);
    const metadata = {
        faceLibType: 'blackFD', FDID: '1',
        FPID: employeeNo,
        name: name || `User ${employeeNo}`,
    };
    const { body, boundary } = buildFaceMultipart(metadata, processedBuffer, 'image/jpeg');
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json`,
        { method: 'POST', headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length }, body },
    );
    return response.json();
}
async function updateFace(deviceId, employeeNo, file, name) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const processedBuffer = await processImageForIntercom(file);
    const metadata = {
        faceLibType: 'blackFD', FDID: '1',
        FPID: employeeNo,
        name: name || `User ${employeeNo}`,
    };
    const { body, boundary } = buildFaceMultipart(metadata, processedBuffer, 'image/jpeg');
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/Intelligent/FDLib/FDModify?format=json`,
        { method: 'PUT', headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length }, body },
    );
    return response.json();
}
async function deleteFace(deviceId, employeeNo) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const payload = JSON.stringify({ FPID: [{ value: employeeNo }] });
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }, body: payload },
    );
    return response.json();
}
// ── PINs ──────────────────────────────────────────────────────────────────────
async function listIntercomPins(deviceId) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/UserInfo/Search?format=json`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ UserInfoSearchCond: { searchID: '1', searchResultPosition: 0, maxResults: 30 } }),
        },
    );
    const data = await response.json();
    // Filter to only users that actually have a dynamicCode set
    const users = data.UserInfoSearch?.UserInfo ?? [];
    const withPin = users
        .filter(u => u.dynamicCode && u.dynamicCode !== '')
        .map(u => ({ employeeNo: u.employeeNo, name: u.name, dynamicCode: u.dynamicCode }));
    return { ok: true, data: withPin };
}
async function getIntercomPin(deviceId, employeeNo) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/UserInfo/Search?format=json`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                UserInfoSearchCond: {
                    searchID: '1', searchResultPosition: 0, maxResults: 1,
                    EmployeeNoList: [{ employeeNo }],
                },
            }),
        },
    );
    const data = await response.json();
    const user = data.UserInfoSearch?.UserInfo?.[0];
    if (!user) { return { ok: false, error: 'User not found' }; }
    return { ok: true, data: { employeeNo: user.employeeNo, name: user.name, dynamicCode: user.dynamicCode ?? null } };
}
async function setIntercomPin(deviceId, employeeNo, dynamicCode) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const payload = { UserInfo: { employeeNo, dynamicCode } };
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/UserInfo/Modify?format=json`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    );
    const data = await response.json();
    if (data.statusCode !== 1) { return data; }
    // Keep DB in sync — find the intercom_user record by employeeNo, then update it
    const intercomUser = await intercomUserRepository.findIntercomUserByEmployeeNo(employeeNo);
    if (intercomUser) {
        await intercomUserRepository.updateIntercomUser(intercomUser.intercom_user_id, { employeeNo, dynamicCode });
    }
    return data;
}
async function updateIntercomPin(deviceId, employeeNo, dynamicCode) {
    return setIntercomPin(deviceId, employeeNo, dynamicCode);
}
async function deleteIntercomPin(deviceId, employeeNo) {
    // ISAPI has no dedicated delete — clearing the field is the correct approach
    return setIntercomPin(deviceId, employeeNo, '');
}
// ── Cards ─────────────────────────────────────────────────────────────────────
async function listCards(deviceId) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const payload = { CardInfoSearchCond: { searchID: '1', searchResultPosition: 0, maxResults: 30 } };
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/CardInfo/Search?format=json`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    );
    return { status: response.status, body: await response.text() };
}
async function assignCard(deviceId, employeeNo, cardNo) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const payload = { CardInfo: { employeeNo, cardNo: formatCardForHikvision(cardNo), cardType: 'normalCard' } };
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/CardInfo/Record?format=json`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    );
    return response.json();
}
async function updateCard(deviceId, employeeNo, cardNo) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const payload = { CardInfo: { employeeNo, cardNo: formatCardForHikvision(cardNo), cardType: 'normalCard' } };
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/CardInfo/Modify?format=json`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    );
    return response.json();
}
async function deleteCard(deviceId, cardNo) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const payload = { CardInfoDelCond: { CardNoList: [{ cardNo: formatCardForHikvision(cardNo) }] } };
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/CardInfo/Delete?format=json`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    );
    return response.json();
}
// ── Invitations ───────────────────────────────────────────────────────────────
async function listInvitations() {
    return invitationRepository.findAll();
}
async function getInvitation(id) {
    return invitationRepository.findById(id);
}
async function createInvitation({ unitId, createdByUserId, validFrom, validUntil, type, deviceIds }) {
    const invitation = await invitationRepository.create({ unitId, createdByUserId, validFrom, validUntil, type });
    if (Array.isArray(deviceIds) && deviceIds.length > 0) {
        await Promise.all(
            deviceIds.map(deviceId => invitationRepository.assignDevice(invitation.invitation_id, deviceId)),
        );
    }
    return { invitation, url: `${FRONTEND_URL}/invite/${invitation.invitation_id}` };
}
async function registerVisitorToInvitation(invitationId, body, file) {
    const invitation = await invitationRepository.findById(invitationId);
    if (!invitation) { return { notFound: true }; }
    if (invitation.status !== 'pending') { return { alreadyUsed: true }; }
    const intercomDevice = await invitationRepository.findFirstIntercom(invitation.invitation_id);
    if (!intercomDevice) { return { noIntercom: true }; }
    const { intercom, client } = await getIntercomClient(intercomDevice.device_id);
    const dynamicCode = String(Math.floor(100000 + Math.random() * 900000));
    const employeeNo = String(Date.now());
    const payload = JSON.stringify({
        UserInfo: {
            employeeNo,
            name: body.name,
            userType: 'visitor',
            Valid: {
                enable: true,
                beginTime: formatHikvisionTime(invitation.valid_from),
                endTime: formatHikvisionTime(invitation.valid_until),
                timeType: 'local',
            },
            dynamicCode,
            doorRight: '1',
            userVerifyMode: 'cardOrPw',
        },
    });
    console.log("PAYLOAD: ", payload);
    const userResponse = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/UserInfo/Record?format=json`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload },
    );
    console.log("RESPONSE: ", userResponse);
    const userData = await userResponse.json();
    if (userData.statusCode !== 1) { throw new Error(userData.errorMsg || 'Intercom error'); }
    if (file) {
        await enrollFace(intercomDevice.device_id, employeeNo, file, body.name);
    }
    const visitor = await visitorRepository.createVisitor(body.name, body.email, body.phone, body.vehiclePlate);
    await invitationRepository.registerVisitor(invitation.invitation_id, visitor.visitor_id, employeeNo, dynamicCode);
    return { dynamicCode };
}
async function deleteInvitation(id) {
    const invitation = await invitationRepository.findById(id);
    if (!invitation) { return { notFound: true }; }
    if (invitation.hikvision_employee_no) {
        try {
            const intercomDevice = await invitationRepository.findFirstIntercom(invitation.invitation_id);
            if (intercomDevice) {
                const { intercom, client } = await getIntercomClient(intercomDevice.device_id);
                const payload = JSON.stringify({ UserInfoDelCond: { EmployeeNoList: [{ employeeNo: invitation.hikvision_employee_no }] } });
                await client.fetch(
                    `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/UserInfo/Delete?format=json`,
                    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: payload },
                );
            }
        } catch (e) {
            console.error('[DELETE VISITOR FROM INTERCOM]', e.message);
        }
    }
    await invitationRepository.deleteInvitation(invitation.invitation_id);
    if (invitation.visitor_id) {
        await visitorRepository.deleteVisitor(invitation.visitor_id);
    }
    return { ok: true };
}

module.exports = {
    // Device listing
    listIntercoms, listCameras,
    // Device management
    getDevicesByCondominium, getDevicesByZone, createDevice, updateDevice, deleteDevice, moveDeviceToZone,
    // Open door
    openDoor,
    // Intercom users
    listIntercomUsers, createIntercomUser, updateIntercomUser, deleteIntercomUser,
    // Face enrollment
    enrollFace, updateFace, deleteFace,
    // PINs 
    listIntercomPins, getIntercomPin, setIntercomPin, updateIntercomPin, deleteIntercomPin,
    // Cards
    listCards, assignCard, updateCard, deleteCard,
    // Invitations
    listInvitations, getInvitation, createInvitation, registerVisitorToInvitation, deleteInvitation,
};