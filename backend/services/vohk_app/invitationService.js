const crypto = require('crypto');
const invitationRepository = require('../../repositories/invitationRepository');
const visitorRepository = require('../../repositories/visitorRepository');
const unitRepository = require('../../repositories/unitRepository');
const deviceRepository = require('../../repositories/deviceRepository');
const intercomRepository = require('../../repositories/intercomRepository');
const deviceService = require('./deviceService');
const FRONTEND_URL = 'https://app.vohk.cl';
const INVITATION_TYPES = ['visit', 'delivery', 'service'];

function createError(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
}
function formatHikvisionTime(date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(new Date(date));
    const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
}
async function getAccessibleUnit(userId, role, unitId) {
    if (role === 'admin') {
        const unit = await unitRepository.findUnitByIdAndAdmin(unitId, userId);
        if (!unit) {
            throw createError('Unit not found or not accessible', 404);
        }
        return unit;
    }
    const residentUnits = await unitRepository.findUnitsByUser(userId);
    const residentUnit = residentUnits.find(unit => unit.unit_id === unitId);
    if (!residentUnit) {
        throw createError('Unit not found or not accessible', 404);
    }
    const hierarchy = await unitRepository.findUnitHierarchy(unitId);
    if (!hierarchy) {
        throw createError('Unit not found', 404);
    }
    return hierarchy;
}
async function validateIntercoms(unit, deviceIds) {
    const uniqueDeviceIds = [...new Set(deviceIds)];
    if (uniqueDeviceIds.some(deviceId => typeof deviceId !== 'string' || deviceId.trim() === '')) {
        throw createError('Invalid intercom ID', 400);
    }
    const condominiumDevices = await deviceRepository.findDevicesByCondominium(unit.condominium_id);
    const selectedIntercoms = condominiumDevices.filter(device => uniqueDeviceIds.includes(device.device_id) && device.type === 'intercom' && device.intercom_id);
    if (selectedIntercoms.length !== uniqueDeviceIds.length) {
        throw createError('One or more intercoms are invalid or do not belong to the unit condominium', 400);
    }
    if (selectedIntercoms.some(device => device.active !== true)) {
        throw createError('One or more selected intercoms are inactive', 400);
    }
    return uniqueDeviceIds;
}
async function getIntercomClient(deviceId) {
    const intercom = await intercomRepository.findIntercomByDeviceId(deviceId);
    if (!intercom) {
        throw createError(`Intercom not found: ${deviceId}`, 404);
    }
    const DigestFetch = (await import('digest-fetch')).default;
    return { intercom, client: new DigestFetch(intercom.username, intercom.password_encrypted) };
}
async function createIntercomVisitor(intercomDevice, invitation, visitor, employeeNo, dynamicCode) {
    const { intercom, client } = await getIntercomClient(intercomDevice.device_id);
    const payload = {
        UserInfo: {
            employeeNo,
            name: visitor.name,
            userType: 'visitor',
            Valid: { enable: true, beginTime: formatHikvisionTime(invitation.valid_from), endTime: formatHikvisionTime(invitation.valid_until), timeType: 'local' },
            dynamicCode,
            doorRight: String(intercom.door_id || 1),
            userVerifyMode: 'cardOrPw',
        },
    };
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/UserInfo/Record?format=json`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    );
    const data = await response.json();
    if (!response.ok || data.statusCode !== 1) {
        throw createError(data.errorMsg || `Could not register visitor in ${intercom.name}`, 502);
    }
}
async function deleteIntercomVisitor(deviceId, employeeNo) {
    const { intercom, client } = await getIntercomClient(deviceId);
    const payload = { UserInfoDelCond: { EmployeeNoList: [{ employeeNo }] } };
    const response = await client.fetch(
        `http://${intercom.ip_address}:${intercom.port}/ISAPI/AccessControl/UserInfo/Delete?format=json`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    );
    const data = await response.json();
    if (!response.ok || data.statusCode !== 1) {
        throw createError(data.errorMsg || `Could not delete visitor from ${intercom.name}`, 502);
    }
}
async function cleanUpIntercomVisitors(deviceIds, employeeNo) {
    const results = await Promise.allSettled(deviceIds.map(deviceId => deleteIntercomVisitor(deviceId, employeeNo)));
    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.error(`[INVITATION INTERCOM CLEANUP ${deviceIds[index]}]`, result.reason);
        }
    });
}

async function listInvitations({ userId, role, unitId }) {
    await getAccessibleUnit(userId, role, unitId);
    return invitationRepository.findByUnitId(unitId);
}
async function createInvitation({ userId, role, unitId, validFrom, validUntil, type = 'visit', deviceIds }) {
    if (!INVITATION_TYPES.includes(type)) {
        throw createError('Invalid invitation type', 400);
    }
    const begin = new Date(validFrom);
    const end = new Date(validUntil);
    if (Number.isNaN(begin.getTime()) || Number.isNaN(end.getTime())) {
        throw createError('Invalid invitation dates', 400);
    }
    if (begin.getTime() < Date.now() - 60000) {
        throw createError('Invitation start cannot be in the past', 400);
    }
    if (end <= begin) {
        throw createError('Invitation end must be after its start', 400);
    }
    const unit = await getAccessibleUnit(userId, role, unitId);
    const validDeviceIds = await validateIntercoms(unit, deviceIds);
    const invitation = await invitationRepository.createWithDevices({ unitId, createdByUserId: userId, validFrom: begin, validUntil: end, type, deviceIds: validDeviceIds });
    return { invitation, url: `${FRONTEND_URL}/invite/${invitation.invitation_id}` };
}
async function getPublicInvitation(invitationId) {
    const invitation = await invitationRepository.findById(invitationId);
    if (!invitation) {
        return null;
    }
    const expired = new Date(invitation.valid_until) <= new Date();
    return {
        invitation_id: invitation.invitation_id,
        type: invitation.type,
        status: expired ? 'expired' : invitation.status,
        valid_from: invitation.valid_from,
        valid_until: invitation.valid_until,
    };
}
async function registerVisitor({ invitationId, visitor, photo }) {
    const invitation = await invitationRepository.findById(invitationId);
    if (!invitation) {
        throw createError('Invitation not found', 404);
    }
    if (invitation.status !== 'pending') {
        throw createError('Invitation has already been registered', 409);
    }
    if (new Date(invitation.valid_until) <= new Date()) {
        throw createError('Invitation has expired', 410);
    }
    const intercoms = await invitationRepository.findIntercoms(invitationId);
    if (intercoms.length === 0) {
        throw createError('Invitation has no assigned intercoms', 400);
    }
    const normalizedVisitor = {
        name: visitor.name.trim(),
        email: visitor.email?.trim() || null,
        phone: visitor.phone?.trim() || null,
        vehiclePlate: visitor.vehiclePlate?.trim() || null,
    };
    const dynamicCode = String(crypto.randomInt(100000, 1000000));
    const employeeNo = `${Date.now()}${crypto.randomInt(100, 1000)}`;
    const configuredDeviceIds = [];
    try {
        for (const intercom of intercoms) {
            await createIntercomVisitor(intercom, invitation, normalizedVisitor, employeeNo, dynamicCode);
            configuredDeviceIds.push(intercom.device_id);
            if (photo) {
                const faceResult = await deviceService.enrollFace(intercom.device_id, employeeNo, photo, normalizedVisitor.name);
                if (faceResult.statusCode !== 1) {
                    throw createError(faceResult.errorMsg || `Could not register face in ${intercom.name}`, 502);
                }
            }
        }
    } catch (error) {
        await cleanUpIntercomVisitors(configuredDeviceIds, employeeNo);
        throw error;
    }
    const createdVisitor = await visitorRepository.createVisitor(normalizedVisitor.name, normalizedVisitor.email, normalizedVisitor.phone, normalizedVisitor.vehiclePlate);
    const registeredInvitation = await invitationRepository.registerVisitor(invitationId, createdVisitor.visitor_id, employeeNo, dynamicCode);
    if (!registeredInvitation) {
        await cleanUpIntercomVisitors(configuredDeviceIds, employeeNo);
        await visitorRepository.deleteVisitor(createdVisitor.visitor_id);
        throw createError('Invitation has already been registered', 409);
    }
    return { dynamicCode };
}
async function deleteInvitation({ invitationId, userId, role }) {
    const invitation = await invitationRepository.findById(invitationId);
    if (!invitation) {
        return null;
    }
    await getAccessibleUnit(userId, role, invitation.unit_id);
    if (invitation.hikvision_employee_no) {
        const intercoms = await invitationRepository.findIntercoms(invitationId);
        for (const intercom of intercoms) {
            await deleteIntercomVisitor(intercom.device_id, invitation.hikvision_employee_no);
        }
    }
    const deletedInvitation = await invitationRepository.deleteInvitation(invitationId);
    if (invitation.visitor_id) {
        await visitorRepository.deleteVisitor(invitation.visitor_id);
    }
    return deletedInvitation;
}

module.exports = { listInvitations, createInvitation, getPublicInvitation, registerVisitor, deleteInvitation };