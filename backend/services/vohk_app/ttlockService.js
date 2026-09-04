const ttlockClient = require('../../integrations/ttlock/ttlockClient');
const ttlockRepository = require('../../repositories/ttlockRepository');
const condominiumRepository = require('../../repositories/condominiumRepository');
const residentUnitRepository = require('../../repositories/residentUnitRepository');
const intercomUserRepository = require('../../repositories/intercomUserRepository');
const userRepository = require('../../repositories/userRepository');
const activityRepository = require('../../repositories/activityRepository');

function httpError(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function asTimestamp(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) throw httpError('Invalid passcode timestamp', 400);
    return parsed;
}

function asDate(value) {
    if (value === undefined || value === null || Number(value) === 0) return null;
    return new Date(Number(value));
}

function validatePasscode(value, required = true) {
    if (!required && (value === undefined || value === null || value === '')) return undefined;
    const normalized = String(value);
    if (!/^\d{4,12}$/.test(normalized)) {
        throw httpError('Passcode must contain between 4 and 12 digits', 400);
    }
    return normalized;
}

async function requireTtlockDevice(deviceId) {
    const lock = await ttlockRepository.findByDeviceId(deviceId);
    if (!lock) throw httpError('TTLock device not found', 404);
    if (!lock.active) throw httpError('TTLock device is inactive', 409);
    return lock;
}

async function assertDeviceAccess(lock, user, { manage = false } = {}) {
    if (user.role === 'superadmin') return;
    if (user.role === 'admin') {
        const condominium = await condominiumRepository.findByIdAndAdmin(lock.condominium_id, user.userId);
        if (condominium) return;
    }
    if (!manage && user.role === 'resident') {
        const assignment = await residentUnitRepository.findByUserAndCondominium(user.userId, lock.condominium_id);
        if (assignment) return;
    }
    throw httpError('You do not have permission to access this lock', 403);
}

function publicLock(lock) {
    const scene = Number(lock.lockVersion?.scene);
    return {
        lockId: lock.lockId,
        keyId: lock.keyId,
        lockAlias: lock.lockAlias,
        lockName: lock.lockName,
        lockMac: lock.lockMac,
        electricQuantity: lock.electricQuantity,
        keyboardPwdVersion: lock.keyboardPwdVersion,
        specialValue: lock.specialValue,
        hasGateway: Number(lock.hasGateway) === 1,
        remoteEnabled: Number(lock.remoteEnable) === 1,
        keyRight: Number(lock.keyRight),
        userType: lock.userType,
        suggestedDeviceType: scene === 2 ? 'gate' : 'lock',
    };
}

async function listAvailableLocks() {
    const [locks, registeredIds] = await Promise.all([
        ttlockClient.listAccountLocks(),
        ttlockRepository.findRegisteredLockIds(),
    ]);
    const registered = new Set(registeredIds);
    return locks
        .filter(lock => !registered.has(String(lock.lockId)))
        .map(publicLock);
}

async function resolveAccountLock(lockId) {
    const locks = await ttlockClient.listAccountLocks();
    const lock = locks.find(candidate => String(candidate.lockId) === String(lockId));
    if (!lock) throw httpError('Lock is not available to the configured TTLock master account', 404);
    if (Number(lock.keyRight) !== 1 && String(lock.userType) !== '110301') {
        throw httpError('The configured TTLock account does not have administrative rights for this lock', 403);
    }
    return {
        ...publicLock(lock),
        remoteEnable: Number(lock.remoteEnable),
        metadata: {
            userType: lock.userType,
            keyRight: Number(lock.keyRight),
            lockName: lock.lockName,
            groupId: lock.groupId || null,
            groupName: lock.groupName || null,
            lockVersion: lock.lockVersion || null,
        },
    };
}

async function refreshDevice(deviceId, user) {
    const lock = await requireTtlockDevice(deviceId);
    await assertDeviceAccess(lock, user, { manage: true });
    const accountLock = await resolveAccountLock(lock.lock_id);
    return ttlockRepository.updateLockFromAccount(deviceId, accountLock);
}

async function openDoor(deviceId, user) {
    const lock = await requireTtlockDevice(deviceId);
    await assertDeviceAccess(lock, user);
    try {
        const response = await ttlockClient.unlock(lock.lock_id);
        await activityRepository.createActivity({
            condominiumId: lock.condominium_id,
            deviceId,
            actorUserId: user.userId,
            eventType: 'door_open',
            status: 'succeeded',
            source: 'ttlock',
            participants: [{ userId: user.userId, role: 'actor' }],
            metadata: { lockId: String(lock.lock_id), deviceType: lock.type, ttlockResponse: response },
        }).catch(error => console.error('Could not record TTLock door activity:', error));
        return { ok: true, deviceName: lock.device_name };
    } catch (error) {
        await activityRepository.createActivity({
            condominiumId: lock.condominium_id,
            deviceId,
            actorUserId: user.userId,
            eventType: 'door_open',
            status: 'failed',
            source: 'ttlock',
            participants: [{ userId: user.userId, role: 'actor' }],
            metadata: { lockId: String(lock.lock_id), deviceType: lock.type, error: error.message, code: error.code },
        }).catch(logError => console.error('Could not record failed TTLock door activity:', logError));
        throw error;
    }
}

async function listPasscodes(deviceId, user, filters = {}) {
    const lock = await requireTtlockDevice(deviceId);
    await assertDeviceAccess(lock, user, { manage: true });
    return ttlockClient.listPasscodes(lock.lock_id, filters);
}

async function createPasscode(deviceId, user, input) {
    const lock = await requireTtlockDevice(deviceId);
    await assertDeviceAccess(lock, user, { manage: true });
    if (Number(lock.keyboard_pwd_version) !== 4) {
        throw httpError('This TTLock device does not support gateway-managed custom passcodes', 422);
    }
    const keyboardPwd = validatePasscode(input.keyboardPwd);
    const startDate = asTimestamp(input.startDate, 0);
    const endDate = asTimestamp(input.endDate, 0);
    if (startDate && endDate && startDate >= endDate) {
        throw httpError('Passcode endDate must be after startDate', 400);
    }
    const purpose = input.purpose || 'manual';
    if (!['resident_dynamic', 'visitor', 'staff', 'manual'].includes(purpose)) {
        throw httpError('Invalid passcode purpose', 400);
    }
    if (input.assignedUserId) {
        const assignment = await residentUnitRepository.findByUserAndCondominium(
            input.assignedUserId,
            lock.condominium_id,
        );
        if (!assignment) throw httpError('Assigned resident does not belong to this condominium', 400);
    }
    const response = await ttlockClient.addPasscode(lock.lock_id, {
        keyboardPwd,
        keyboardPwdName: input.keyboardPwdName,
        startDate,
        endDate,
    });
    const keyboardPwdId = response.keyboardPwdId;
    if (!keyboardPwdId) throw httpError('TTLock did not return a passcode ID', 502);
    const local = await ttlockRepository.upsertPasscode({
        ttlockLockId: lock.ttlock_lock_id,
        keyboardPwdId,
        keyboardPwd,
        keyboardPwdName: input.keyboardPwdName || null,
        keyboardPwdType: input.keyboardPwdType || null,
        purpose,
        assignedUserId: input.assignedUserId || null,
        createdByUserId: user.userId,
        validFrom: asDate(startDate),
        validUntil: asDate(endDate),
    });
    return { ...response, local };
}

async function changePasscode(deviceId, keyboardPwdId, user, input) {
    const lock = await requireTtlockDevice(deviceId);
    await assertDeviceAccess(lock, user, { manage: true });
    const keyboardPwd = validatePasscode(input.keyboardPwd, false);
    const startDate = asTimestamp(input.startDate, undefined);
    const endDate = asTimestamp(input.endDate, undefined);
    const response = await ttlockClient.changePasscode(lock.lock_id, keyboardPwdId, {
        keyboardPwd,
        keyboardPwdName: input.keyboardPwdName,
        startDate,
        endDate,
    });
    const local = await ttlockRepository.updatePasscode(keyboardPwdId, lock.ttlock_lock_id, {
        keyboardPwd,
        keyboardPwdName: input.keyboardPwdName,
        validFrom: asDate(startDate),
        validUntil: asDate(endDate),
        status: 'active',
    });
    return { ...response, local };
}

async function deletePasscode(deviceId, keyboardPwdId, user) {
    const lock = await requireTtlockDevice(deviceId);
    await assertDeviceAccess(lock, user, { manage: true });
    const response = await ttlockClient.deletePasscode(lock.lock_id, keyboardPwdId);
    await ttlockRepository.markPasscodeDeleted(keyboardPwdId, lock.ttlock_lock_id);
    return response;
}

async function listUnlockRecords(deviceId, user, filters = {}) {
    const lock = await requireTtlockDevice(deviceId);
    await assertDeviceAccess(lock, user, { manage: true });
    return ttlockClient.listUnlockRecords(lock.lock_id, filters);
}

async function setResidentDynamicCodeOnLock(lock, userId, dynamicCode, createdByUserId = userId) {
    const existing = await ttlockRepository.findResidentPasscode(lock.ttlock_lock_id, userId);
    const keyboardPwdName = `Vohk resident ${userId}`;
    if (existing) {
        await ttlockClient.changePasscode(lock.lock_id, existing.keyboard_pwd_id, {
            keyboardPwd: dynamicCode,
            keyboardPwdName,
        });
        await ttlockRepository.updatePasscode(existing.keyboard_pwd_id, lock.ttlock_lock_id, {
            keyboardPwd: dynamicCode,
            keyboardPwdName,
            status: 'active',
        });
        return { deviceId: lock.device_id, keyboardPwdId: existing.keyboard_pwd_id, created: false };
    }
    const response = await ttlockClient.addPasscode(lock.lock_id, {
        keyboardPwd: dynamicCode,
        keyboardPwdName,
        startDate: 0,
        endDate: 0,
    });
    if (!response.keyboardPwdId) throw httpError('TTLock did not return a passcode ID', 502);
    await ttlockRepository.upsertPasscode({
        ttlockLockId: lock.ttlock_lock_id,
        keyboardPwdId: response.keyboardPwdId,
        keyboardPwd: dynamicCode,
        keyboardPwdName,
        keyboardPwdType: 2,
        purpose: 'resident_dynamic',
        assignedUserId: userId,
        createdByUserId,
    });
    return { deviceId: lock.device_id, keyboardPwdId: response.keyboardPwdId, created: true };
}

async function updateResidentDynamicCode(userId, dynamicCode) {
    const locks = await ttlockRepository.findByResident(userId);
    const results = [];
    for (const lock of locks) {
        try {
            if (Number(lock.keyboard_pwd_version) !== 4) {
                throw httpError('Lock does not support gateway-managed custom passcodes', 422);
            }
            const result = await setResidentDynamicCodeOnLock(lock, userId, dynamicCode);
            results.push({ ...result, success: true });
        } catch (error) {
            results.push({ deviceId: lock.device_id, success: false, error: error.message, code: error.code });
        }
    }
    return results;
}

async function provisionResidents(deviceId, createdByUserId) {
    const lock = await requireTtlockDevice(deviceId);
    const residents = await userRepository.getUsersByCondominium(lock.condominium_id);
    const results = [];
    for (const resident of residents) {
        const intercomAssignments = await intercomUserRepository.findIntercomUsersByUserAndCondominium(
            resident.user_id,
            lock.condominium_id,
        );
        const dynamicCode = intercomAssignments.find(item => /^\d{6}$/.test(item.dynamic_code || ''))?.dynamic_code;
        if (!dynamicCode) {
            results.push({ userId: resident.user_id, success: false, skipped: true, error: 'Resident has no synchronized dynamic code' });
            continue;
        }
        try {
            const result = await setResidentDynamicCodeOnLock(lock, resident.user_id, dynamicCode, createdByUserId);
            results.push({ userId: resident.user_id, success: true, ...result });
        } catch (error) {
            results.push({ userId: resident.user_id, success: false, error: error.message, code: error.code });
        }
    }
    return {
        ok: results.every(result => result.success || result.skipped),
        residents: residents.length,
        succeeded: results.filter(result => result.success).length,
        skipped: results.filter(result => result.skipped).length,
        failures: results.filter(result => !result.success && !result.skipped),
    };
}

module.exports = {
    listAvailableLocks,
    resolveAccountLock,
    refreshDevice,
    openDoor,
    listPasscodes,
    createPasscode,
    changePasscode,
    deletePasscode,
    listUnlockRecords,
    updateResidentDynamicCode,
    provisionResidents,
    _private: { publicLock, validatePasscode, asTimestamp },
};
