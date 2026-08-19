const sharp = require('sharp');
const { v4: uuid } = require('uuid');
const FRONTEND_URL = "https://app.vohk.cl";
const condominiumRepository = require('../../repositories/condominiumRepository');
const residentUnitRepository = require('../../repositories/residentUnitRepository');
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
    return sharp(file.buffer).rotate().resize(600, 600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 75, mozjpeg: true }).toBuffer();
}
// ── Device listing ────────────────────────────────────────────────────────────
async function getMobileDevices({ userId, role, condominiumId }) {
    let condominium = null;
    if (role === 'admin') {
        condominium = await condominiumRepository.findByIdAndAdmin(condominiumId, userId);
        if (!condominium) {
            const error = new Error('Condominium not found or not accessible');
            error.status = 404;
            throw error;
        }
    } else if (role === 'resident') {
        const residentUnit = await residentUnitRepository.findByUserAndCondominium(userId, condominiumId);
        if (!residentUnit) {
            const error = new Error('Condominium not found or not accessible');
            error.status = 404;
            throw error;
        }
        condominium = await condominiumRepository.findById(condominiumId);
    } else if (role !== 'superadmin') {
        const error = new Error('Forbidden');
        error.status = 403;
        throw error;
    }
    const devices = await deviceRepository.findMobileDevicesByCondominium(condominiumId);
    if (role === 'resident' && condominium?.resident_camera_access !== true) {
        return devices.filter(device => device.type !== 'camera');
    }
    return devices;
}
async function getDevicesByCondominium(condominiumId, userId, role) {
    if (role === 'admin') {
        const allowed = await condominiumRepository.findByIdAndAdmin(condominiumId, userId);
        if (!allowed) {
            const error = new Error('Condominium not found or not accessible');
            error.status = 404;
            throw error;
        }
    }
    const rows = await deviceRepository.findDeviceTreeRows(condominiumId);
    const condominium = { condominium_id: condominiumId, name: rows[0]?.condominium_name, address: rows[0]?.address, city: rows[0]?.city, zones: [], _zoneMap: new Map() };
    for (const row of rows) {
        if (!row.zone_id) continue;
        let zone = condominium._zoneMap.get(row.zone_id);
        if (!zone) {
            zone = { zone_id: row.zone_id, name: row.zone_name, devices: [] };
            condominium._zoneMap.set(row.zone_id, zone);
            condominium.zones.push(zone);
        }
        if (!row.device_id) continue;
        zone.devices.push({ device_id: row.device_id, type: row.type, vendor: row.vendor, name: row.device_name, ip_address: row.ip_address, port: row.port, username: row.username, password_encrypted: row.password_encrypted, snapshot_url: row.snapshot_url, stream_url: row.stream_url, active: row.active, last_seen_at: row.last_seen_at, created_at: row.device_created_at, intercom_id: row.intercom_id, sip_address: row.sip_address, door_id: row.door_id });
    }
    delete condominium._zoneMap;
    return condominium;
}
// ── Device management ─────────────────────────────────────────────────────────
async function createDevice(deviceData, intercomData = null) {
    const device = await deviceRepository.createDevice({ zoneId: deviceData.zoneId, type: deviceData.type, vendor: deviceData.vendor, name: deviceData.name, ipAddress: deviceData.ipAddress, port: deviceData.port, username: deviceData.username, passwordEncrypted: deviceData.passwordEncrypted, snapshotUrl: deviceData.snapshotUrl, streamUrl: deviceData.streamUrl, active: deviceData.active ?? true });
    if (device.type === 'intercom') {
        if (!intercomData?.sipAddress) {
            await deviceRepository.deleteDevice(device.device_id);
            const error = new Error('SIP address is required for an intercom');
            error.status = 400;
            throw error;
        }
        try {
            await intercomRepository.createIntercom(device.device_id, intercomData.sipAddress, intercomData.doorId);
        } catch (error) {
            await deviceRepository.deleteDevice(device.device_id);
            throw error;
        }
    }
    return device;
}
async function updateDeviceName(deviceId, userId, role, name) {
    if (role === 'admin') {
        const existingDevice = await deviceRepository.findDeviceByIdAndAdmin(deviceId, userId);
        if (!existingDevice) {
            const error = new Error('Device not found');
            error.status = 404;
            throw error;
        }
    }
    return deviceRepository.updateDeviceName(deviceId, name);
}
async function deleteDevice(deviceId) {
    return deviceRepository.deleteDevice(deviceId);
}
async function moveDeviceToZone(deviceId, zoneId, userId, role) {
    if (role === 'superadmin') {
        return deviceRepository.moveDeviceToZone(deviceId, zoneId);
    }
    const device = await deviceRepository.findDeviceByIdAndAdmin(deviceId, userId);
    if (!device) {
        const error = new Error('Device not found');
        error.status = 404;
        throw error;
    }
    const zone = await zoneRepository.findById(zoneId);
    if (!zone || zone.condominium_id !== device.condominium_id) {
        const error = new Error('Zone does not belong to the same condominium');
        error.status = 400;
        throw error;
    }
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
// GET ACCESS METHODS
async function getAccessMethods(userId) {
    const accessRows = await intercomUserRepository.findAccessMethods(userId);
    if (accessRows.length === 0) {
        return { hasFace: false, hasDynamicCode: false, hasCard: false, dynamicCode: null, faceUpdatedAt: null };
    }
    const firstCode = accessRows[0].dynamic_code;
    const dynamicCodeIsSynchronized = typeof firstCode === 'string' && /^\d{6}$/.test(firstCode) && accessRows.every(row => row.dynamic_code === firstCode);
    const hasFace = accessRows.every(row => row.has_face === true);
    const faceUpdatedAt = hasFace ? accessRows.map(row => row.face_updated_at).filter(Boolean).sort().at(-1) ?? null : null;
    return { hasFace, hasDynamicCode: dynamicCodeIsSynchronized, hasCard: false, dynamicCode: dynamicCodeIsSynchronized ? firstCode : null, faceUpdatedAt };
}
// ── Face enrollment ───────────────────────────────────────────────────────────
async function enrollFace(deviceId, employeeNo, file, name) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const processedBuffer = await processImageForIntercom(file);
    const metadata = {
        faceLibType: 'blackFD',
        FDID: '1',
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
async function deleteFace(deviceId, employeeNo) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const payload = JSON.stringify({ FPID: [{ value: employeeNo }] });
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }, body: payload },
    );
    return response.json();
}
async function updateResidentFace(userId, file) {
    await processImageForIntercom(file);
    const intercomUsers = await intercomUserRepository.findIntercomUsersWithDeviceByUserId(userId);
    if (intercomUsers.length === 0) {
        const error = new Error('User has no intercom assignments');
        error.status = 404;
        throw error;
    }
    const results = [];
    for (const intercomUser of intercomUsers) {
        try {
            if (intercomUser.has_face === true) {
                const deleteResponse = await deleteFace(intercomUser.device_id, intercomUser.employee_no);
                if (deleteResponse.statusCode !== 1) {
                    results.push({
                        intercomId: intercomUser.intercom_id,
                        deviceId: intercomUser.device_id,
                        operation: 'delete-existing-face',
                        success: false,
                        response: deleteResponse,
                    });
                    continue;
                }
                await intercomUserRepository.updateFaceStatus(intercomUser.intercom_user_id, false);
            }
            const enrollResponse = await enrollFace(intercomUser.device_id, intercomUser.employee_no, file);
            const success = enrollResponse.statusCode === 1;
            if (success) {
                await intercomUserRepository.updateFaceStatus(intercomUser.intercom_user_id, true);
            }
            results.push({
                intercomId: intercomUser.intercom_id,
                deviceId: intercomUser.device_id,
                operation: intercomUser.has_face === true ? 'replace' : 'enroll',
                success,
                response: enrollResponse,
            });
        } catch (error) {
            results.push({
                intercomId: intercomUser.intercom_id,
                deviceId: intercomUser.device_id,
                operation: intercomUser.has_face === true ? 'replace' : 'enroll',
                success: false,
                error: error.message,
            });
        }
    }
    const failedResults = results.filter(result => !result.success);
    if (failedResults.length > 0) {
        console.error('Resident face update failures:', JSON.stringify(failedResults, null, 2));
        const error = new Error('Could not update the face on all intercoms');
        error.status = 502;
        throw error;
    }
    return { success: true, updatedIntercoms: results.length };
}
async function deleteResidentFace(userId) {
    const intercomUsers = await intercomUserRepository.findIntercomUsersWithDeviceByUserId(userId);
    if (intercomUsers.length === 0) {
        const error = new Error('User has no intercom assignments');
        error.status = 404;
        throw error;
    }
    const results = [];
    for (const intercomUser of intercomUsers) {
        if (intercomUser.has_face !== true) {
            results.push({
                intercomId: intercomUser.intercom_id,
                deviceId: intercomUser.device_id,
                success: true,
                skipped: true,
            });
            continue;
        }
        try {
            const response = await deleteFace(intercomUser.device_id, intercomUser.employee_no);
            const success = response.statusCode === 1;
            if (success) {
                await intercomUserRepository.updateFaceStatus(intercomUser.intercom_user_id, false);
            }
            results.push({
                intercomId: intercomUser.intercom_id,
                deviceId: intercomUser.device_id,
                success,
                skipped: false,
                response,
            });
        } catch (error) {
            results.push({
                intercomId: intercomUser.intercom_id,
                deviceId: intercomUser.device_id,
                success: false,
                skipped: false,
                error: error.message,
            });
        }
    }
    const failedResults = results.filter(result => !result.success);
    if (failedResults.length > 0) {
        console.error('Resident face deletion failures:', JSON.stringify(failedResults, null, 2));
        const error = new Error('Could not delete the face from all intercoms');
        error.status = 502;
        throw error;
    }
    const deletedIntercoms = results.filter(result => !result.skipped).length;
    return { success: true, deletedIntercoms };
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
    if (data.statusCode !== 1) {
        return data;
    }
    const intercomUser = await intercomUserRepository.findIntercomUserByDeviceAndEmployeeNo(deviceId, employeeNo);
    if (intercomUser) {
        await intercomUserRepository.updateDynamicCode(intercomUser.intercom_user_id, dynamicCode);
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
async function updateResidentDynamicCode(userId, dynamicCode) {
    if (typeof dynamicCode !== 'string' || !/^\d{6}$/.test(dynamicCode)) {
        const error = new Error('Dynamic code must contain exactly 6 digits');
        error.status = 400;
        throw error;
    }
    const intercomUsers = await intercomUserRepository.findIntercomUsersWithDeviceByUserId(userId);
    if (intercomUsers.length === 0) {
        const error = new Error('User has no intercom assignments');
        error.status = 404;
        throw error;
    }
    const results = [];
    for (const intercomUser of intercomUsers) {
        try {
            const response = await setIntercomPin(intercomUser.device_id, intercomUser.employee_no, dynamicCode);
            const success = response.statusCode === 1;
            results.push({ intercomId: intercomUser.intercom_id, deviceId: intercomUser.device_id, success, error: success ? null : response.errorMsg || 'Intercom rejected the dynamic code' });
        } catch (error) {
            results.push({ intercomId: intercomUser.intercom_id, deviceId: intercomUser.device_id, success: false, error: error.message });
        }
    }
    const failedResults = results.filter(result => !result.success);
    if (failedResults.length > 0) {
        const error = new Error('Could not update the dynamic code on all intercoms');
        error.status = 502;
        throw error;
    }
    return { success: true, dynamicCode, updatedIntercoms: results.length };
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
// ── SIP Numbers ───────────────────────────────────────────────────────────────
async function searchIntercomPhoneRecords(deviceId) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const payload = {
        PhoneSearchDescription: {
            searchID: uuid().replace(/-/g, ''),
            maxResults: 20,
            searchResultPosition: 0,
            RoomNoList: []
        }
    };
    const url = `http://${intercom.ip_address}:${intercom.port}/ISAPI/VideoIntercom/PhoneNumberRecords/phoneSearch?format=json`;
    console.log('SEARCH SIP URL:', url);
    console.log('SEARCH SIP PAYLOAD:', JSON.stringify(payload));
    const response = await client.fetch(
        url,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    );
    const data = await response.json();
    console.log('SEARCH SIP RESPONSE:', response.status, data);
    if (!response.ok || data.PhoneSearchResult?.responseStatusStrg !== 'OK') {
        return { ok: false, status: response.status, data };
    }
    return { ok: true, records: data.PhoneSearchResult?.PhoneNumberRecords ?? [], data };
}
async function createIntercomPhoneRecord(deviceId, roomNo, phoneNumbers) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const payload = {
        PhoneNumberRecord: {
            roomNo: String(roomNo),
            PhoneNumbers: phoneNumbers.map(phoneNumber => ({ phoneNumber: String(phoneNumber) }))
        }
    };
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/VideoIntercom/PhoneNumberRecords?format=json`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    );
    const data = await response.json();
    return { ok: response.ok && data.statusCode === 1, status: response.status, data };
}
async function updateIntercomPhoneRecord(deviceId, recordId, roomNo, phoneNumbers) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const payload = {
        PhoneNumberRecord: {
            roomNo: String(roomNo),
            PhoneNumbers: phoneNumbers.map(phoneNumber => ({ phoneNumber: String(phoneNumber) }))
        }
    };
    console.log('UPDATE SIP RECORD:', recordId, JSON.stringify(payload));
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/VideoIntercom/PhoneNumberRecords/${recordId}?format=json`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    );
    const data = await response.json();
    console.log('UPDATE SIP RESPONSE:', response.status, data);
    return { ok: response.ok && data.statusCode === 1, status: response.status, data };
}
async function deleteIntercomPhoneRecord(deviceId, recordId) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/VideoIntercom/PhoneNumberRecords/${recordId}?format=json`,
        { method: 'DELETE' },
    );
    const data = await response.json();
    return { ok: response.ok && data.statusCode === 1, status: response.status, data };
}
async function syncIntercomRoomSipNumbers(deviceId, roomNo, phoneNumbers) {
    const normalizedPhoneNumbers = [...new Set(
        phoneNumbers
            .filter(phoneNumber => phoneNumber !== null && phoneNumber !== undefined)
            .map(phoneNumber => String(phoneNumber).trim())
            .filter(phoneNumber => phoneNumber !== '')
    )];
    console.log('SYNC SIP:', { deviceId, roomNo: String(roomNo), phoneNumbers: normalizedPhoneNumbers });
    const searchResult = await searchIntercomPhoneRecords(deviceId);
    if (!searchResult.ok) {
        return searchResult;
    }
    const phoneRecord = searchResult.records.find(record => String(record.roomNo) === String(roomNo));
    if (!phoneRecord) {
        console.log('SYNC SIP OPERATION: CREATE');
        if (!normalizedPhoneNumbers.length) {
            return { ok: true, skipped: true };
        }
        return createIntercomPhoneRecord(deviceId, roomNo, normalizedPhoneNumbers);
    }
    if (!normalizedPhoneNumbers.length) {
        console.log('SYNC SIP OPERATION: DELETE', phoneRecord.id);
        return deleteIntercomPhoneRecord(deviceId, phoneRecord.id);
    }
    console.log('SYNC SIP OPERATION: UPDATE', phoneRecord.id);
    return updateIntercomPhoneRecord(deviceId, phoneRecord.id, roomNo, normalizedPhoneNumbers);
}

module.exports = {
    // Device listing
    getMobileDevices,
    // Device management
    getDevicesByCondominium, createDevice, updateDeviceName, deleteDevice, moveDeviceToZone,
    // Open door
    openDoor,
    // Intercom users
    listIntercomUsers, createIntercomUser, updateIntercomUser, deleteIntercomUser, getAccessMethods,
    // Face enrollment
    enrollFace, deleteFace, updateResidentFace, deleteResidentFace,
    // PINs 
    listIntercomPins, getIntercomPin, setIntercomPin, updateIntercomPin, deleteIntercomPin, updateResidentDynamicCode,
    // Cards
    listCards, assignCard, updateCard, deleteCard,
    // SIP Numbers
    searchIntercomPhoneRecords, createIntercomPhoneRecord, updateIntercomPhoneRecord, deleteIntercomPhoneRecord, syncIntercomRoomSipNumbers
};