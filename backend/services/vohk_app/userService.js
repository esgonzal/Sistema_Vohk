const userRepository = require('../../repositories/userRepository');
const unitRepository = require('../../repositories/unitRepository');
const condominiumRepository = require('../../repositories/condominiumRepository');
const deviceRepository = require('../../repositories/deviceRepository');
const residentUnitRepository = require('../../repositories/residentUnitRepository');
const intercomUserRepository = require('../../repositories/intercomUserRepository');
const deviceService = require('../../services/vohk_app/deviceService');
const staffCondominiumRepository = require('../../repositories/staffCondominiumRepository');
const invitationService = require('./invitationService');
const emailService = require('../vohk_app/emailService');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

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
    const expectedDv = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
    return suppliedDv === expectedDv;
}

function formatRut(rut) {
    const normalized = normalizeRut(rut);
    return `${normalized.slice(0, -1)}-${normalized.slice(-1)}`;
}

async function getUsersByCondominium(userId, role, condominiumId) {
    if (role === 'admin') {
        const condominium = await condominiumRepository.findByIdAndAdmin(condominiumId, userId);
        if (!condominium) {
            const error = new Error('Condominium not found');
            error.status = 404;
            throw error;
        }
    }
    if (role === 'staff') {
        const assignment = await staffCondominiumRepository.findByUserAndCondominium(userId, condominiumId);
        if (!assignment) {
            const error = new Error('Condominium not found');
            error.status = 404;
            throw error;
        }
    }
    return userRepository.getUsersByCondominium(condominiumId);
}
async function createManagementUser(creatorUserId, creatorRole, { legalName, rut, email, role, condominiumId }) {
    if (!['admin', 'staff'].includes(role)) {
        const error = new Error('Only admin or staff users can be created through this endpoint');
        error.status = 400;
        throw error;
    }
    if (role === 'admin' && creatorRole !== 'superadmin') {
        const error = new Error('Only superadmin can create administrators');
        error.status = 403;
        throw error;
    }
    if (role === 'staff' && !['admin', 'superadmin'].includes(creatorRole)) {
        const error = new Error('Only administrators or superadmin can create staff');
        error.status = 403;
        throw error;
    }
    if (!isValidRut(rut)) {
        const error = new Error('Invalid RUT');
        error.status = 400;
        throw error;
    }
    const formattedRut = formatRut(rut);
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedLegalName = legalName.trim();
    const sipIdentity = normalizeRut(rut).slice(0, -1);
    const existingRut = await userRepository.findByRut(formattedRut);
    if (existingRut) {
        const error = new Error('RUT is already registered');
        error.status = 409;
        throw error;
    }
    const existingEmail = await userRepository.findByEmail(normalizedEmail);
    if (existingEmail) {
        const error = new Error('Email is already registered');
        error.status = 409;
        throw error;
    }
    const existingIdentity = await userRepository.findByIdentity(sipIdentity);
    if (existingIdentity) {
        const error = new Error('SIP identity is already registered');
        error.status = 409;
        throw error;
    }
    if (role === 'staff') {
        if (!condominiumId) {
            const error = new Error('Condominium ID is required for staff');
            error.status = 400;
            throw error;
        }
        const condominium = creatorRole === 'superadmin'
            ? await condominiumRepository.findById(condominiumId)
            : await condominiumRepository.findByIdAndAdmin(condominiumId, creatorUserId);
        if (!condominium) {
            const error = new Error('Condominium not found');
            error.status = 404;
            throw error;
        }
    }
    const temporaryPassword = crypto.randomInt(100000, 1000000).toString();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const user = await userRepository.createManagementUser(
        normalizedEmail,
        passwordHash,
        formattedRut,
        sipIdentity,
        normalizedEmail,
        normalizedLegalName,
        role
    );
    if (role === 'staff') {
        try {
            await staffCondominiumRepository.assignStaff(user.user_id, condominiumId);
        } catch (error) {
            console.error(`Could not assign staff ${user.user_id} to condominium ${condominiumId}:`, error.message);
            throw error;
        }
    }
    try {
        await emailService.sendResidentWelcomeEmail({
            toEmail: normalizedEmail,
            legalName: normalizedLegalName,
            temporaryPassword
        });
    } catch (error) {
        console.error(`Could not send welcome email to ${normalizedEmail}:`, error.message);
    }
    return user;
}
async function createResident(unitId, userId, role, { legalName, rut, email, isPrimary }) {
    const unit = role === 'superadmin' ? await unitRepository.findUnitHierarchy(unitId) : await unitRepository.findUnitByIdAndAdmin(unitId, userId);
    if (!unit) {
        const error = new Error('Unit not found');
        error.status = 404;
        throw error;
    }
    const formattedRut = rut.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedLegalName = legalName.trim();
    const sipIdentity = formattedRut.replace(/[.-]/g, '').slice(0, -1);
    let resident = await userRepository.findByRut(formattedRut);
    let isNewUser = false;
    let temporaryPassword = null;
    if (!resident) {
        isNewUser = true;
        temporaryPassword = crypto.randomInt(100000, 1000000).toString();
        const passwordHash = await bcrypt.hash(temporaryPassword, 10);
        resident = await userRepository.createResident(normalizedEmail, passwordHash, formattedRut, sipIdentity, normalizedEmail, normalizedLegalName);
    }
    const currentUnits = await residentUnitRepository.findUnitsByUser(resident.user_id);
    const alreadyInSameCondo = currentUnits.some(currentUnit => currentUnit.condominium_id === unit.condominium_id);
    await residentUnitRepository.assignResident(resident.user_id, unitId, isPrimary ?? false);
    const devices = await deviceRepository.findDevicesByCondominium(unit.condominium_id);
    const intercoms = devices.filter(device => device.type === 'intercom');
    if (!alreadyInSameCondo) {
        const dynamicCode = crypto.randomInt(100000, 1000000).toString();
        for (const device of intercoms) {
            try {
                const result = await deviceService.createIntercomUser(device.device_id, { employeeNo: resident.sip_identity, dynamicCode, name: resident.legal_name, roomNumber: unit.room_no, floorNumber: unit.floor ?? 1 });
                if (result.ok || result.error === 'employeeNoAlreadyExist') {
                    await intercomUserRepository.createIntercomUser(resident.user_id, device.intercom_id, resident.sip_identity, dynamicCode);
                } else {
                    console.error(`Intercom sync failed for device ${device.device_id}:`, result.error);
                }
            } catch (error) {
                console.error(`Unexpected intercom error for device ${device.device_id}:`, error.message);
            }
        }
    }
    await syncUnitSipNumbers(unit, intercoms);
    if (isNewUser && temporaryPassword) {
        try {
            await emailService.sendResidentWelcomeEmail({ toEmail: normalizedEmail, legalName: normalizedLegalName, temporaryPassword });
        } catch (error) {
            console.error(`Could not send welcome email to ${normalizedEmail}:`, error.message);
        }
    }
    return resident;
}
async function updateResident(residentId, userId, role, { unitId, legalName, email, isPrimary }) {
    const unit = role === 'superadmin' ? await unitRepository.findUnitHierarchy(unitId) : await unitRepository.findUnitByIdAndAdmin(unitId, userId);
    if (!unit) return null;
    const residentUnit = await residentUnitRepository.findByUserAndUnit(residentId, unitId);
    if (!residentUnit) return null;
    await userRepository.updateResident(residentId, email.toLowerCase(), legalName);
    await residentUnitRepository.updateResidentUnit(residentId, unitId, isPrimary);
    return userRepository.findById(residentId);
}
async function deleteResident(residentId, unitId, userId, role) {
    const unit = role === 'superadmin' ? await unitRepository.findUnitHierarchy(unitId) : await unitRepository.findUnitByIdAndAdmin(unitId, userId);
    if (!unit) return null;
    const residentUnit = await residentUnitRepository.findByUserAndUnit(residentId, unitId);
    if (!residentUnit) return null;
    await invitationService.revokeByResidentUnit(residentId, unitId);
    const currentUnits = await residentUnitRepository.findUnitsByUser(residentId);
    const otherUnitsInSameCondo = currentUnits.some(currentUnit => currentUnit.unit_id !== unitId && currentUnit.condominium_id === unit.condominium_id);
    const devices = await deviceRepository.findDevicesByCondominium(unit.condominium_id);
    const intercoms = devices.filter(device => device.type === 'intercom');
    if (!otherUnitsInSameCondo) {
        const condominiumIntercomUsers = await intercomUserRepository.findIntercomUsersByUserAndCondominium(residentId, unit.condominium_id);
        for (const row of condominiumIntercomUsers) {
            const response = await deviceService.deleteIntercomUser(row.device_id, row.employee_no);
            if (!response || response.statusCode !== 1) {
                const error = new Error('Could not remove resident access from all condominium intercoms');
                error.status = 502;
                throw error;
            }
        }
        for (const row of condominiumIntercomUsers) {
            await intercomUserRepository.deleteIntercomUserByUserAndIntercom(residentId, row.intercom_id);
        }
    }
    await residentUnitRepository.unassignResident(residentId, unitId);
    await syncUnitSipNumbers(unit, intercoms);
    if (otherUnitsInSameCondo) return { removedFromUnitOnly: true };
    return { removedFromCondo: true };
}
async function updateUsername(userId, username) {
    const existing = await userRepository.findByUsername(username);
    if (existing && existing.user_id !== userId) {
        const error = new Error('Username is already in use');
        error.status = 409;
        throw error;
    }
    return userRepository.updateUsername(userId, username);
}
async function updateEmail(userId, email) {
    const normalizedEmail = email.toLowerCase();
    const existing = await userRepository.findByEmail(normalizedEmail);
    if (existing && existing.user_id !== userId) {
        const error = new Error('Email is already in use');
        error.status = 409;
        throw error;
    }
    return userRepository.updateEmail(userId, normalizedEmail);
}
async function updatePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findById(userId);
    if (!user) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
    }
    if (newPassword.length < 8) {
        const error = new Error('New password must contain at least 8 characters');
        error.status = 400;
        throw error;
    }
    if (Buffer.byteLength(newPassword, 'utf8') > 72) {
        const error = new Error('New password is too long');
        error.status = 400;
        throw error;
    }
    if (newPassword === currentPassword) {
        const error = new Error('New password must be different from the current password');
        error.status = 400;
        throw error;
    }
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
        const error = new Error('Current password is incorrect');
        error.status = 401;
        throw error;
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userRepository.updatePassword(userId, passwordHash);
    return true;
}
async function syncUnitSipNumbers(unit, intercoms) {
    const sipIdentities = await residentUnitRepository.findSipIdentitiesByUnit(unit.unit_id);
    for (const device of intercoms) {
        const result = await deviceService.syncIntercomRoomSipNumbers(device.device_id, unit.room_no, sipIdentities);
        if (!result.ok) {
            console.error(`SIP sync failed for device ${device.device_id}:`, result);
            const error = new Error('Could not synchronize the unit SIP numbers with all condominium intercoms');
            error.status = 502;
            throw error;
        }
    }
}

module.exports = {
    getUsersByCondominium, createResident, updateResident, deleteResident,
    updateUsername, updateEmail, updatePassword, createManagementUser
};
