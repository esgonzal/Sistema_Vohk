const crypto = require('crypto');
const invitationRepository = require('../../repositories/invitationRepository');
const visitorRepository = require('../../repositories/visitorRepository');
const unitRepository = require('../../repositories/unitRepository');
const residentUnitRepository = require('../../repositories/residentUnitRepository');
const staffCondominiumRepository = require('../../repositories/staffCondominiumRepository');
const deviceRepository = require('../../repositories/deviceRepository');
const intercomRepository = require('../../repositories/intercomRepository');
const deviceService = require('./deviceService');
const { getAdapterForIntercom } = require('./hikvision/adapterFactory');

const INVITATION_TYPES = ['recurrent', 'temporary', 'express'];

function createError(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizeRut(rut) {
    return String(rut || '').replace(/\./g, '').replace(/-/g, '').replace(/\s/g, '').toUpperCase();
}

function isValidRut(rut) {
    const normalized = normalizeRut(rut);
    if (!/^\d{7,8}[0-9K]$/.test(normalized)) return false;
    const body = normalized.slice(0, -1);
    const suppliedDv = normalized.slice(-1);
    let sum = 0;
    let multiplier = 2;
    for (let i = body.length - 1; i >= 0; i--) {
        sum += Number(body[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const remainder = 11 - (sum % 11);
    let expectedDv;
    if (remainder === 11) expectedDv = '0';
    else if (remainder === 10) expectedDv = 'K';
    else expectedDv = String(remainder);
    return suppliedDv === expectedDv;
}

function formatRut(rut) {
    const normalized = normalizeRut(rut);
    return `${normalized.slice(0, -1)}-${normalized.slice(-1)}`;
}

function formatHikvisionTime(date) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', }).formatToParts(new Date(date));
    const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
}

function getPermanentHikvisionEndDate() {
    return new Date('2037-12-31T23:59:59-03:00');
}

async function getAccessibleUnit(userId, role, unitId) {
    if (role === 'superadmin') {
        const unit = await unitRepository.findUnitHierarchy(unitId);
        if (!unit) throw createError('Unit not found', 404);
        return unit;
    }
    if (role === 'admin') {
        const unit = await unitRepository.findUnitByIdAndAdmin(unitId, userId);
        if (!unit) throw createError('Unit not found or not accessible', 404);
        return unit;
    }
    if (role === 'staff') {
        const unit = await unitRepository.findUnitHierarchy(unitId);
        if (!unit) throw createError('Unit not found', 404);
        const assignment = await staffCondominiumRepository.findByUserAndCondominium(userId, unit.condominium_id);
        if (!assignment) throw createError('Unit not found or not accessible', 404);
        return unit;
    }
    if (role === 'resident') {
        const relation = await residentUnitRepository.findByUserAndUnit(userId, unitId);
        if (!relation) throw createError('Unit not found or not accessible', 404);
        const unit = await unitRepository.findUnitHierarchy(unitId);
        if (!unit) throw createError('Unit not found', 404);
        return unit;
    }
    throw createError('Forbidden', 403);
}

async function validateResidentForUnit({ userId, role, residentUserId, unitId }) {
    const targetResidentUserId = role === 'resident' ? userId : residentUserId;
    if (!targetResidentUserId) {
        throw createError('Resident user ID is required', 400);
    }
    if (role === 'resident' && residentUserId && residentUserId !== userId) {
        throw createError('Residents can only create invitations for themselves', 403);
    }
    const relation = await residentUnitRepository.findByUserAndUnit(targetResidentUserId, unitId);
    if (!relation) throw createError('The selected resident does not belong to this unit', 400);
    return targetResidentUserId;
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
    return selectedIntercoms;
}

async function getIntercomAdapter(deviceId) {
    const intercom = await intercomRepository.findIntercomByDeviceId(deviceId);
    if (!intercom) throw createError(`Intercom not found: ${deviceId}`, 404);
    return { intercom, adapter: await getAdapterForIntercom(intercom) };
}

async function createIntercomVisitor({ deviceId, invitation, visitorName, employeeNo, dynamicCode }) {
    const { intercom, adapter } = await getIntercomAdapter(deviceId);
    const endDate = invitation.valid_until || getPermanentHikvisionEndDate();
    const userInfo = adapter.buildVisitorUserInfo({
        invitation: {
            ...invitation,
            valid: {
                enable: true,
                beginTime: formatHikvisionTime(invitation.valid_from),
                endTime: formatHikvisionTime(endDate),
                timeType: 'local',
            },
        },
        visitorName,
        employeeNo,
        dynamicCode,
    });
    const { response, data } = await adapter.createUser(userInfo);
    
    if (!response.ok || data.statusCode !== 1) {
        throw createError(data.errorMsg || `Could not register visitor in ${intercom.name}`, 502);
    }
}

async function deleteIntercomVisitor(deviceId, employeeNo) {
    const { intercom, adapter } = await getIntercomAdapter(deviceId);
    const { response, data } = await adapter.deleteUser(employeeNo);
    if (!response.ok || data.statusCode !== 1) {
        throw createError(data.errorMsg || `Could not delete visitor from ${intercom.name}`, 502);
    }
}

function validateVisitor(visitor) {
    if (!visitor) throw createError('Visitor information is required', 400);
    const name = String(visitor.name || '').trim();
    const rut = String(visitor.rut || '').trim();
    if (!name) throw createError('Visitor name is required', 400);
    if (!rut) throw createError('Visitor RUT is required', 400);
    if (!isValidRut(rut)) throw createError('Invalid visitor RUT', 400);
    return { name, rut: formatRut(rut), email: String(visitor.email || '').trim() || null, phone: String(visitor.phone || '').trim() || null, vehiclePlate: String(visitor.vehiclePlate || '').trim() || null, };
}

function calculateValidity({ type, validFrom, validUntil, durationHours, settings }) {
    const now = new Date();
    if (type === 'express') {
        const hours = Number(durationHours);
        if (!Number.isInteger(hours) || hours <= 0) {
            throw createError('Express duration must be a positive number of hours', 400);
        }
        if (hours > settings.max_express_duration_hours) {
            throw createError(`Express invitation cannot exceed ${settings.max_express_duration_hours} hours`, 400);
        }
        return { begin: now, end: new Date(now.getTime() + hours * 60 * 60 * 1000), };
    }
    const begin = new Date(validFrom);
    if (Number.isNaN(begin.getTime())) {
        throw createError('Invalid invitation start date', 400);
    }
    if (begin.getTime() < Date.now() - 60000) {
        throw createError('Invitation start cannot be in the past', 400);
    }
    if (type === 'recurrent') {
        return { begin, end: null };
    }
    const end = new Date(validUntil);
    if (Number.isNaN(end.getTime())) {
        throw createError('Invalid invitation end date', 400);
    }
    if (end <= begin) {
        throw createError('Invitation end must be after its start', 400);
    }
    const durationMs = end.getTime() - begin.getTime();
    const maxDurationMs = settings.max_temporary_duration_hours * 60 * 60 * 1000;
    if (durationMs > maxDurationMs) {
        throw createError(`Temporary invitation cannot exceed ${settings.max_temporary_duration_hours} hours`, 400);
    }
    return { begin, end };
}

async function listInvitations({ userId, role, unitId }) {
    await getAccessibleUnit(userId, role, unitId);
    return invitationRepository.findByUnitId(unitId);
}

async function createInvitation({ userId, role, unitId, residentUserId, type, validFrom, validUntil, durationHours, deviceIds, visitor, photo, biometricConsent }) {
    if (!INVITATION_TYPES.includes(type)) {
        throw createError('Invalid invitation type', 400);
    }
    if (role === 'staff' && type === 'recurrent') {
        throw createError('Staff cannot create recurrent invitations', 403);
    }
    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
        throw createError('At least one intercom is required', 400);
    }
    if (type === 'express' && photo) {
        throw createError('Express invitations cannot use face access', 400);
    }
    if (photo && biometricConsent !== true) {
        throw createError('Biometric consent confirmation is required when a photo is attached', 400);
    }
    const unit = await getAccessibleUnit(userId, role, unitId);
    const ownerResidentUserId = await validateResidentForUnit({ userId, role, residentUserId, unitId });
    const settings = await invitationRepository.getCondominiumSettings(unit.condominium_id);
    if (!settings) throw createError('Condominium configuration not found', 500);
    const { begin, end } = calculateValidity({ type, validFrom, validUntil, durationHours, settings, });
    const selectedIntercoms = await validateIntercoms(unit, deviceIds);
    let normalizedVisitor = null;
    if (type !== 'express') {
        normalizedVisitor = validateVisitor(visitor);
    }
    const dynamicCode = String(crypto.randomInt(100000, 1000000));
    const employeeNo = `${Date.now()}${crypto.randomInt(100, 1000)}`;
    const hasFace = type !== 'express' && Boolean(photo);
    const invitationData = { valid_from: begin, valid_until: end, };
    const visitorName = normalizedVisitor?.name || 'Pase Express';
    const provisionedDeviceIds = [];
    try {
        for (const intercom of selectedIntercoms) {
            await createIntercomVisitor({ deviceId: intercom.device_id, invitation: invitationData, visitorName, employeeNo, dynamicCode });
            provisionedDeviceIds.push(intercom.device_id);
            if (hasFace) {
                const faceResult = await deviceService.enrollFace(intercom.device_id, employeeNo, photo, normalizedVisitor.name);
                if (faceResult.statusCode !== 1) {
                    throw createError(faceResult.errorMsg || `Could not register face in ${intercom.name}`, 502);
                }
            }
        }
    } catch (error) {
        console.error('[INVITATION PROVISION]', error);
        for (const deviceId of provisionedDeviceIds) {
            try {
                await deleteIntercomVisitor(deviceId, employeeNo);
            } catch (cleanupError) {
                console.error(`[INVITATION PROVISION CLEANUP ${deviceId}]`, cleanupError);
            }
        }
        throw error;
    }
    let createdVisitor = null;
    try {
        if (normalizedVisitor) {
            createdVisitor = await visitorRepository.createVisitor(normalizedVisitor.name, normalizedVisitor.rut, normalizedVisitor.email, normalizedVisitor.phone, normalizedVisitor.vehiclePlate);
        }
        const invitation = await invitationRepository.createInvitationWithDevices({
            visitorId: createdVisitor?.visitor_id || null, unitId, createdByUserId: userId, residentUserId: ownerResidentUserId, employeeNo, dynamicCode, hasFace,
            biometricConsentAt: hasFace ? new Date() : null, type, validFrom: begin, validUntil: end, deviceIds: selectedIntercoms.map(device => device.device_id),
        });

        return { ...invitation, visitor: normalizedVisitor, dynamic_code: dynamicCode, provisioned_devices: selectedIntercoms.length, total_devices: selectedIntercoms.length };
    } catch (error) {
        if (createdVisitor) {
            await visitorRepository.deleteVisitor(createdVisitor.visitor_id);
        }
        for (const deviceId of provisionedDeviceIds) {
            try {
                await deleteIntercomVisitor(deviceId, employeeNo);
            } catch (cleanupError) {
                console.error(`[INVITATION DATABASE CLEANUP ${deviceId}]`, cleanupError);
            }
        }
        throw error;
    }
}

async function revokeInvitation(invitation) {
    if (invitation.hikvision_employee_no) {
        const intercoms = await invitationRepository.findIntercoms(invitation.invitation_id);
        for (const intercom of intercoms) {
            await deleteIntercomVisitor(intercom.device_id, invitation.hikvision_employee_no);
        }
    }
    return invitationRepository.markRevoked(invitation.invitation_id);
}

async function deleteInvitation({ invitationId, userId, role }) {
    const invitation = await invitationRepository.findById(invitationId);
    if (!invitation) return null;
    await getAccessibleUnit(userId, role, invitation.unit_id);
    const canDelete = role === 'superadmin' || role === 'admin' || invitation.created_by_user_id === userId;
    if (!canDelete) {
        throw createError('Only the invitation creator or an administrator can revoke this invitation', 403);
    }
    return revokeInvitation(invitation);
}

async function revokeByResidentUnit(residentUserId, unitId) {
    const invitations = await invitationRepository.findActiveByResidentUnit(residentUserId, unitId);
    for (const invitation of invitations) {
        await revokeInvitation(invitation);
    }
    return invitations.length;
}

async function processExpiredInvitations() {
    const expired = await invitationRepository.findExpiredActiveInvitations();
    let processed = 0;
    for (const invitation of expired) {
        try {
            if (invitation.hikvision_employee_no) {
                const intercoms = await invitationRepository.findIntercoms(invitation.invitation_id);

                for (const intercom of intercoms) {
                    await deleteIntercomVisitor(intercom.device_id, invitation.hikvision_employee_no);
                }
            }
            await invitationRepository.markExpired(invitation.invitation_id);
            processed++;
        } catch (error) {
            console.error(`[INVITATION EXPIRE ${invitation.invitation_id}]`, error);
        }
    }

    return processed;
}

module.exports = { listInvitations, createInvitation, deleteInvitation, revokeByResidentUnit, processExpiredInvitations };
