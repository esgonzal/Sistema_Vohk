const sharp = require('sharp');
const FRONTEND_URL = "https://app.vohk.cl";
const condominiumRepository = require('../../repositories/condominiumRepository');
const residentUnitRepository = require('../../repositories/residentUnitRepository');
const deviceRepository = require('../../repositories/deviceRepository');
const invitationRepository = require('../../repositories/invitationRepository');
const visitorRepository = require('../../repositories/visitorRepository');
const intercomUserRepository = require('../../repositories/intercomUserRepository');
const intercomRepository = require('../../repositories/intercomRepository');
const activityRepository = require('../../repositories/activityRepository');
const staffCondominiumRepository = require('../../repositories/staffCondominiumRepository');
const userRepository = require('../../repositories/userRepository');
const crypto = require('crypto');
const { getAdapterForIntercom } = require('./hikvision/adapterFactory');
const { fetchHikvisionIdentity } = require('./hikvision/identityService');

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCardForHikvision(cardNumber) {
    return String(cardNumber).padStart(10, '0');
}
async function getIntercomAdapter(deviceId) {
    const intercom = await deviceRepository.findIntercomByDeviceId(deviceId);
    if (!intercom) {
        const error = new Error(`Intercom not found: ${deviceId}`);
        error.status = 404;
        throw error;
    }
    return { intercom, adapter: await getAdapterForIntercom(intercom) };
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
    } else if (role === 'staff') {
        const assignment = await staffCondominiumRepository.findByUserAndCondominium(userId, condominiumId);
        if (!assignment) {
            const error = new Error('Condominium not found or not accessible');
            error.status = 404;
            throw error;
        }
        condominium = await condominiumRepository.findById(condominiumId);
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
        zone.devices.push({ device_id: row.device_id, type: row.type, vendor: row.vendor, name: row.device_name, model: row.model, firmware_version: row.firmware_version, firmware_build: row.firmware_build, isapi_capabilities: row.isapi_capabilities, identity_checked_at: row.identity_checked_at, ip_address: row.ip_address, port: row.port, snapshot_url: row.snapshot_url, stream_url: row.stream_url, active: row.active, last_seen_at: row.last_seen_at, created_at: row.device_created_at, intercom_id: row.intercom_id, sip_address: row.sip_address, door_id: row.door_id, dial_period_number: row.dial_period_number, dial_building_number: row.dial_building_number, dial_unit_number: row.dial_unit_number });
    }
    delete condominium._zoneMap;
    return condominium;
}
// ── Device management ─────────────────────────────────────────────────────────
async function createDevice(deviceData, intercomData = null) {
    if (deviceData.type === 'intercom') {
        const periodNumber = Number(intercomData?.periodNumber ?? 1);
        const buildingNumber = Number(intercomData?.buildingNumber ?? 1);
        const unitNumber = Number(intercomData?.unitNumber ?? 1);
        if (!Number.isInteger(periodNumber) || periodNumber < 1 || periodNumber > 9
            || !Number.isInteger(buildingNumber) || buildingNumber < 1 || buildingNumber > 999
            || !Number.isInteger(unitNumber) || unitNumber < 1 || unitNumber > 99) {
            const error = new Error('Invalid intercom dialing hierarchy');
            error.status = 400;
            throw error;
        }
    }
    const device = await deviceRepository.createDevice({ zoneId: deviceData.zoneId, type: deviceData.type, vendor: deviceData.vendor, name: deviceData.name, ipAddress: deviceData.ipAddress, port: deviceData.port, username: deviceData.username, passwordEncrypted: deviceData.passwordEncrypted, snapshotUrl: deviceData.snapshotUrl, streamUrl: deviceData.streamUrl, active: deviceData.active ?? true });
    if (device.type === 'intercom') {
        if (!intercomData?.sipAddress) {
            await deviceRepository.deleteDevice(device.device_id);
            const error = new Error('SIP address is required for an intercom');
            error.status = 400;
            throw error;
        }
        try {
            await intercomRepository.createIntercom(device.device_id, intercomData.sipAddress, intercomData.doorId, {
                periodNumber: intercomData.periodNumber,
                buildingNumber: intercomData.buildingNumber,
                unitNumber: intercomData.unitNumber,
            });
        } catch (error) {
            await deviceRepository.deleteDevice(device.device_id);
            throw error;
        }
    }
    if (String(device.vendor).toLowerCase() === 'hikvision') {
        try {
            const identity = await fetchHikvisionIdentity({ ...device, username: deviceData.username, password_encrypted: deviceData.passwordEncrypted });
            return await deviceRepository.updateDeviceIdentity(device.device_id, identity);
        } catch (error) {
            console.warn(`Could not detect identity for new device ${device.device_id}: ${error.message}`);
        }
    }
    return device;
}

async function refreshDeviceIdentity(deviceId) {
    const device = await deviceRepository.findDeviceById(deviceId);
    if (!device) {
        const error = new Error('Device not found');
        error.status = 404;
        throw error;
    }
    if (String(device.vendor).toLowerCase() !== 'hikvision') {
        const error = new Error('Identity refresh is currently supported only for Hikvision devices');
        error.status = 422;
        throw error;
    }
    const identity = await fetchHikvisionIdentity(device);
    return deviceRepository.updateDeviceIdentity(deviceId, identity);
}

async function provisionExistingResidents(deviceId) {
    let context = await getIntercomAdapter(deviceId);
    if (!context.intercom.model) {
        await refreshDeviceIdentity(deviceId);
        context = await getIntercomAdapter(deviceId);
    }
    const { intercom } = context;
    const residents = await userRepository.getUsersByCondominium(intercom.condominium_id);
    const results = [];

    for (const resident of residents) {
        const location = resident.locations?.[0];
        if (!resident.sip_identity || !location) continue;
        const existingAssignments = await intercomUserRepository.findIntercomUsersByUserAndCondominium(
            resident.user_id,
            intercom.condominium_id,
        );
        let dynamicCode = existingAssignments.find(item => /^\d{6}$/.test(item.dynamic_code || ''))?.dynamic_code
            || crypto.randomInt(100000, 1000000).toString();
        try {
            const created = await createIntercomUser(deviceId, {
                employeeNo: resident.sip_identity,
                dynamicCode,
                name: resident.legal_name,
                roomNumber: location.roomNo,
                floorNumber: location.floor ?? 1,
            });
            const duplicate = created.error === 'employeeNoAlreadyExist';
            if (!created.ok && !duplicate) {
                results.push({ userId: resident.user_id, success: false, error: created.error, response: created.raw });
                continue;
            }
            if (duplicate) {
                const existingPin = await getIntercomPin(deviceId, resident.sip_identity);
                if (/^\d{6}$/.test(existingPin.data?.dynamicCode || '')) dynamicCode = existingPin.data.dynamicCode;
            }
            await intercomUserRepository.createIntercomUser(
                resident.user_id,
                intercom.intercom_id,
                resident.sip_identity,
                dynamicCode,
            );
            results.push({ userId: resident.user_id, success: true, existedOnDevice: duplicate });
        } catch (error) {
            results.push({ userId: resident.user_id, success: false, error: error.message });
        }
    }

    const units = new Map();
    for (const resident of residents) {
        for (const location of resident.locations || []) {
            if (!units.has(location.unitId)) units.set(location.unitId, location.roomNo);
        }
    }
    for (const [unitId, roomNo] of units) {
        const sipIdentities = await residentUnitRepository.findSipIdentitiesByUnit(unitId);
        const phonebook = await syncIntercomRoomSipNumbers(deviceId, roomNo, sipIdentities);
        if (!phonebook.ok) {
            results.push({ unitId, success: false, operation: 'phonebook', response: phonebook });
        }
    }

    const failures = results.filter(result => !result.success);
    return {
        ok: failures.length === 0,
        residents: residents.length,
        succeeded: results.filter(result => result.success && result.userId).length,
        failures,
    };
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
    const scope = await deviceRepository.findDeviceAndZoneCondominiums(deviceId, zoneId);
    if (!scope) {
        const error = new Error('Device not found');
        error.status = 404;
        throw error;
    }
    if (scope.device_condominium_id !== scope.zone_condominium_id) {
        const error = new Error('Zone does not belong to the same condominium');
        error.status = 400;
        throw error;
    }
    if (role === 'admin') {
        const device = await deviceRepository.findDeviceByIdAndAdmin(deviceId, userId);
        if (!device) {
            const error = new Error('Device not found');
            error.status = 404;
            throw error;
        }
    }
    return deviceRepository.moveDeviceToZone(deviceId, zoneId);
}
// ── Open door ─────────────────────────────────────────────────────────────────
async function openDoor(deviceId, user) {
    const { intercom, adapter } = await getIntercomAdapter(deviceId);

    let allowed = user.role === 'superadmin';
    if (user.role === 'admin') {
        allowed = Boolean(await condominiumRepository.findByIdAndAdmin(intercom.condominium_id, user.userId));
    } else if (user.role === 'resident') {
        allowed = Boolean(await intercomUserRepository.findIntercomUserByUserAndDevice(user.userId, deviceId));
    }
    if (!allowed) {
        const error = new Error('You do not have permission to open this door');
        error.status = 403;
        throw error;
    }

    try {
        const { response, text } = await adapter.openDoor(intercom.door_id);
        await activityRepository.createActivity({
            condominiumId: intercom.condominium_id,
            deviceId,
            actorUserId: user.userId,
            eventType: 'door_open',
            status: response.ok ? 'succeeded' : 'failed',
            source: 'server',
            participants: [{ userId: user.userId, role: 'actor' }],
            metadata: { intercomName: intercom.name, httpStatus: response.status },
        }).catch(logError => console.error('Could not record door activity:', logError));
        return { ok: response.ok, text, intercomName: intercom.name };
    } catch (error) {
        await activityRepository.createActivity({
            condominiumId: intercom.condominium_id,
            deviceId,
            actorUserId: user.userId,
            eventType: 'door_open',
            status: 'failed',
            source: 'server',
            participants: [{ userId: user.userId, role: 'actor' }],
            metadata: { intercomName: intercom.name, error: error.message },
        }).catch(logError => console.error('Could not record failed door activity:', logError));
        throw error;
    }
}
// ── Intercom users (Hikvision ISAPI) ─────────────────────────────────────────
async function listIntercomUsers(deviceId) {
    const { adapter } = await getIntercomAdapter(deviceId);
    const { response, text } = await adapter.searchUsers();
    return { status: response.status, body: text };
}
async function createIntercomUser(deviceId, { employeeNo, dynamicCode, name, roomNumber, floorNumber = 1, }) {
    const { adapter } = await getIntercomAdapter(deviceId);
    const userInfo = adapter.buildResidentUserInfo({ employeeNo, dynamicCode, name, roomNumber, floorNumber });
    const { data } = await adapter.createUser(userInfo);
    if (data.statusCode !== 1) {
        return { ok: false, error: data.errorMsg, raw: data };
    }
    return { ok: true, data };
}
async function updateIntercomUser(deviceId, employeeNo, { name, roomNumber, floorNumber = 1 }) {
    const { adapter } = await getIntercomAdapter(deviceId);
    const userInfo = adapter.buildResidentUserUpdate({ employeeNo, name, roomNumber, floorNumber });
    const { data } = await adapter.updateUser(userInfo);
    return data;
}
async function deleteIntercomUser(deviceId, employeeNo) {
    const { adapter } = await getIntercomAdapter(deviceId);
    const { data } = await adapter.deleteUser(employeeNo);
    return data;
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
    const { adapter } = await getIntercomAdapter(deviceId);
    const processedBuffer = await processImageForIntercom(file);
    const metadata = {
        faceLibType: 'blackFD',
        FDID: '1',
        FPID: employeeNo,
        name: name || `User ${employeeNo}`,
    };
    const { body, boundary } = buildFaceMultipart(metadata, processedBuffer, 'image/jpeg');
    return adapter.enrollFace(body, boundary);
}
async function deleteFace(deviceId, employeeNo) {
    const { adapter } = await getIntercomAdapter(deviceId);
    return adapter.deleteFace(employeeNo);
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
    const { adapter } = await getIntercomAdapter(deviceId);
    const { data } = await adapter.searchUsers();
    // Filter to only users that actually have a dynamicCode set
    const users = data.UserInfoSearch?.UserInfo ?? [];
    const withPin = users
        .filter(u => u.dynamicCode && u.dynamicCode !== '')
        .map(u => ({ employeeNo: u.employeeNo, name: u.name, dynamicCode: u.dynamicCode }));
    return { ok: true, data: withPin };
}
async function getIntercomPin(deviceId, employeeNo) {
    const { adapter } = await getIntercomAdapter(deviceId);
    const { data } = await adapter.searchUsers({ employeeNo, maxResults: 1 });
    const user = data.UserInfoSearch?.UserInfo?.[0];
    if (!user) { return { ok: false, error: 'User not found' }; }
    return { ok: true, data: { employeeNo: user.employeeNo, name: user.name, dynamicCode: user.dynamicCode ?? null } };
}
async function setIntercomPin(deviceId, employeeNo, dynamicCode) {
    const { adapter } = await getIntercomAdapter(deviceId);
    const { data } = await adapter.setPin(employeeNo, dynamicCode);
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
    const { adapter } = await getIntercomAdapter(deviceId);
    const { response, text } = await adapter.searchCards();
    return { status: response.status, body: text };
}
async function assignCard(deviceId, employeeNo, cardNo) {
    const { adapter } = await getIntercomAdapter(deviceId);
    const { data } = await adapter.createCard(employeeNo, formatCardForHikvision(cardNo));
    return data;
}
async function updateCard(deviceId, employeeNo, cardNo) {
    const { adapter } = await getIntercomAdapter(deviceId);
    const { data } = await adapter.updateCard(employeeNo, formatCardForHikvision(cardNo));
    return data;
}
async function deleteCard(deviceId, cardNo) {
    const { adapter } = await getIntercomAdapter(deviceId);
    const { data } = await adapter.deleteCard(formatCardForHikvision(cardNo));
    return data;
}
// ── SIP Numbers ───────────────────────────────────────────────────────────────
async function searchIntercomPhoneRecords(deviceId) {
    const { adapter } = await getIntercomAdapter(deviceId);
    return adapter.searchPhoneRecords();
}
async function createIntercomPhoneRecord(deviceId, roomNo, phoneNumbers) {
    const { adapter } = await getIntercomAdapter(deviceId);
    return adapter.createPhoneRecord(roomNo, phoneNumbers);
}
async function updateIntercomPhoneRecord(deviceId, recordId, roomNo, phoneNumbers) {
    const { adapter } = await getIntercomAdapter(deviceId);
    return adapter.updatePhoneRecord(recordId, roomNo, phoneNumbers);
}
async function deleteIntercomPhoneRecord(deviceId, recordId) {
    const { adapter } = await getIntercomAdapter(deviceId);
    return adapter.deletePhoneRecord(recordId);
}

async function listIntercomAccessEvents(deviceId, filters = {}, user) {
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
        const error = new Error('Forbidden');
        error.status = 403;
        throw error;
    }
    if (user.role === 'admin') {
        const allowed = await deviceRepository.findDeviceByIdAndAdmin(deviceId, user.userId);
        if (!allowed) {
            const error = new Error('Device not found');
            error.status = 404;
            throw error;
        }
    }
    const { adapter } = await getIntercomAdapter(deviceId);
    return adapter.searchAccessEvents(filters);
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
    searchIntercomPhoneRecords, createIntercomPhoneRecord, updateIntercomPhoneRecord, deleteIntercomPhoneRecord, syncIntercomRoomSipNumbers,
    // Device identity and stored access events
    refreshDeviceIdentity, provisionExistingResidents, listIntercomAccessEvents
};
