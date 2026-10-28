const repository = require('../../repositories/hikvisionQrRepository');
const { getAdapterForIntercom, normalizeModel } = require('./hikvision/adapterFactory');
const qrApi = require('./hikvision/qrApi');
const QRCode = require('qrcode');
const crypto = require('node:crypto');

function fail(status, code, message) {
    return Object.assign(new Error(message), { status, code });
}
function uuid(value, label) {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        throw fail(400, 'INVALID_INPUT', `${label} must be a UUID`);
    }
}
function range(value) {
    const min = value?.['@min'], max = value?.['@max'];
    return Number.isInteger(min) && Number.isInteger(max) && min >= 0 && max >= min ? { min, max } : null;
}
function within(value, limits, label) {
    if (!Number.isInteger(value) || value < limits.min || value > limits.max) {
        throw fail(400, 'INVALID_INPUT', `${label} must be an integer between ${limits.min} and ${limits.max}`);
    }
}

function credentialKey() {
    const secret = process.env.QR_CREDENTIAL_SECRET || process.env.JWT_SECRET;
    if (!secret) throw fail(500, 'QR_STORAGE_UNAVAILABLE', 'QR credential storage is not configured');
    return crypto.createHash('sha256').update(secret).digest();
}
function encryptCredential(value) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', credentialKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}
function decryptCredential(value) {
    const [version, iv, tag, encrypted] = String(value || '').split('.');
    if (version !== 'v1' || !iv || !tag || !encrypted) throw fail(500, 'QR_STORAGE_INVALID', 'Stored QR credential is invalid');
    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', credentialKey(), Buffer.from(iv, 'base64url'));
        decipher.setAuthTag(Buffer.from(tag, 'base64url'));
        return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
    } catch {
        throw fail(500, 'QR_STORAGE_INVALID', 'Stored QR credential could not be decrypted');
    }
}
function deviceEncryptionMaterial() {
    const secret = process.env.HIKVISION_QR_SHARED_SECRET || process.env.QR_CREDENTIAL_SECRET || process.env.JWT_SECRET;
    if (!secret) throw fail(500, 'QR_ENCRYPTION_UNAVAILABLE', 'QR device encryption is not configured');
    const material = crypto.createHash('sha256').update(`vohk-hikvision-qr-v1:${secret}`).digest('hex');
    return { key: material.slice(0, 32), vector: material.slice(32, 64) };
}
function createService({ repo = repository, getAdapter = getAdapterForIntercom, api = qrApi,
    render = value => QRCode.toDataURL(value, { width: 600, margin: 4, errorCorrectionLevel: 'M' }) } = {}) {
    async function context(deviceId, actor) {
        if (!actor || !['admin', 'superadmin'].includes(actor.role)) throw fail(403, 'FORBIDDEN', 'Forbidden');
        uuid(deviceId, 'deviceId');
        uuid(actor.userId, 'Authenticated userId');
        const device = await repo.findManagedDevice(deviceId, actor.userId, actor.role);
        if (!device) throw fail(404, 'DEVICE_NOT_FOUND', 'Device not found or not accessible');
        const model = normalizeModel(device.model);
        // Other MinMoe models must be validated explicitly before issuing credentials.
        if (!['DS-KV9503-WBE1', 'DS-K1T343MWX', 'DS-K1T673DWX'].includes(model)) {
            throw fail(422, 'QR_MODEL_UNVALIDATED', 'QR integration has not been validated for this device model');
        }
        return { device, model, adapter: await getAdapter(device) };
    }
    async function capabilities(ctx) {
        let result;
        try { result = await api.getCapabilities(ctx.adapter); }
        catch { throw fail(502, 'QR_DEVICE_UNREACHABLE', 'Could not read device QR capabilities'); }
        const cap = result.data?.QRCodeInfoCap;
        if (!result.ok || !cap || (result.data.statusCode !== undefined && Number(result.data.statusCode) !== 1)) {
            throw fail(502, 'QR_CAPABILITIES_UNAVAILABLE', 'Device did not return usable QR capabilities');
        }
        const limits = { employeeNo: range(cap.employeeNo), valid: range(cap.valid), times: range(cap.times) };
        if (Object.values(limits).some(v => !v)) throw fail(502, 'QR_CAPABILITIES_UNAVAILABLE', 'Device QR limits are incomplete');
        return { deviceId: ctx.device.device_id, model: ctx.model, limits, validityUnit: 'device-defined',
            verification: {
                issuance: 'observed',
                physicalAccess: ['DS-K1T343MWX', 'DS-K1T673DWX'].includes(ctx.model) ? 'observed' : 'unconfirmed',
                eventAttribution: 'unconfirmed',
            } };
    }
    async function getCapabilities(deviceId, actor) {
        return capabilities(await context(deviceId, actor));
    }
    async function issue(deviceId, actor, input) {
        if (!input || typeof input !== 'object' || Array.isArray(input) ||
            Object.keys(input).some(k => !['userId', 'valid', 'times'].includes(k))) {
            throw fail(400, 'INVALID_INPUT', 'Expected userId, valid and times');
        }
        uuid(input.userId, 'userId');
        // These are raw device parameters, not a promise of seconds/minutes or an expiry timestamp.
        within(input.valid, { min: 5, max: 43200 }, 'valid');
        within(input.times, { min: 1, max: 1000 }, 'times');
        const ctx = await context(deviceId, actor);
        const subject = await repo.findRegisteredUser(deviceId, input.userId);
        if (!subject) throw fail(404, 'QR_SUBJECT_NOT_FOUND', 'User is not registered on this device');
        const cap = await capabilities(ctx);
        const employeeNo = String(subject.employee_no ?? '');
        if (!/^\d+$/.test(employeeNo)) throw fail(409, 'QR_INVALID_EMPLOYEE', 'User has no valid device employee identifier');
        within(employeeNo.length, cap.limits.employeeNo, 'employee identifier length');
        within(input.valid, cap.limits.valid, 'valid');
        within(input.times, cap.limits.times, 'times');
        let person;
        try { person = await api.findPerson(ctx.adapter, employeeNo); }
        catch { throw fail(502, 'QR_DEVICE_UNREACHABLE', 'Could not verify the user on the device'); }
        if (!person.ok || !person.data?.UserInfoSearch) throw fail(502, 'QR_USER_CHECK_FAILED', 'Device user lookup failed');
        const matches = person.data.UserInfoSearch.UserInfo;
        if (!Array.isArray(matches) || matches.length !== 1 || String(matches[0].employeeNo) !== employeeNo ||
            matches[0].userType !== 'normal') {
            throw fail(409, 'QR_USER_NOT_PROVISIONED', 'A normal user must already be provisioned on this device');
        }
        let result;
        try { result = await api.issue(ctx.adapter, employeeNo, input.valid, input.times); }
        catch { throw fail(502, 'QR_ISSUANCE_UNCERTAIN', 'Device response was lost; issuance may have occurred. Do not retry automatically.'); }
        if (!result.ok || (result.data?.statusCode !== undefined && Number(result.data.statusCode) !== 1)) {
            // Never echo arbitrary upstream errorMsg: it can contain credentials or person data.
            const timesRejected = result.data?.errorMsg === 'times';
            throw fail(422, timesRejected ? 'QR_TIMES_REJECTED' : 'QR_DEVICE_REJECTED',
                timesRejected ? 'Device rejected the QR usage-count parameter; no automatic fallback was attempted' : 'Device rejected QR issuance');
        }
        const qrCode = result.data?.QRCodeInfo?.QRCodeString;
        if (typeof qrCode !== 'string' || !qrCode.length || qrCode.length > 2048) {
            throw fail(502, 'QR_ISSUANCE_UNCERTAIN', 'Device returned no usable QR payload; do not retry automatically');
        }
        let imageDataUrl;
        try { imageDataUrl = await render(qrCode); }
        catch { throw fail(500, 'QR_RENDER_FAILED', 'QR was issued but image rendering failed; do not retry automatically'); }
        return { deviceId, userId: input.userId, model: ctx.model, qrCode, imageDataUrl,
            requested: { valid: input.valid, times: input.times }, validityUnit: cap.validityUnit,
            issuedAt: new Date().toISOString(), verification: cap.verification };
    }
    function residentResponse(row) {
        return {
            hasQr: true,
            qrCode: decryptCredential(row.qr_payload),
            issuedAt: row.issued_at,
            valid: row.valid_value,
            times: row.usage_limit,
            validityUnit: 'device-defined',
            deletionNotice: 'Removing this QR from Vohk does not revoke an already saved image; it remains usable until the device validity ends.',
        };
    }
    async function getResidentCredential(actor) {
        if (!actor || actor.role !== 'resident') throw fail(403, 'FORBIDDEN', 'Forbidden');
        uuid(actor.userId, 'Authenticated userId');
        const row = await repo.findResidentCredential(actor.userId);
        return row ? residentResponse(row) : { hasQr: false };
    }
    async function issueResidentCredential(actor) {
        if (!actor || actor.role !== 'resident') throw fail(403, 'FORBIDDEN', 'Forbidden');
        uuid(actor.userId, 'Authenticated userId');
        const devices = await repo.findResidentQrDevices(actor.userId);
        if (!devices.length) throw fail(404, 'QR_DEVICE_NOT_FOUND', 'No compatible QR access device is assigned to this resident');
        const employeeNumbers = [...new Set(devices.map(device => String(device.employee_no || '')))];
        if (employeeNumbers.length !== 1 || !/^\d+$/.test(employeeNumbers[0])) {
            throw fail(409, 'QR_EMPLOYEE_MISMATCH', 'Resident identity is not synchronized across QR access devices');
        }
        const contexts = await Promise.all(devices.map(async device => ({
            device,
            model: normalizeModel(device.model),
            adapter: await getAdapter(device),
        })));
        const ctx = contexts[0];
        const device = ctx.device;
        const cap = await capabilities(ctx);
        const employeeNo = employeeNumbers[0];
        within(employeeNo.length, cap.limits.employeeNo, 'employee identifier length');
        const valid = Math.min(43200, cap.limits.valid.max);
        const times = cap.limits.times.min === 0 ? 0 : cap.limits.times.max;
        const encryption = deviceEncryptionMaterial();
        for (const target of contexts) {
            let person;
            try { person = await api.findPerson(target.adapter, employeeNo); }
            catch { throw fail(502, 'QR_DEVICE_UNREACHABLE', 'Could not verify the resident on every QR access device'); }
            const matches = person.data?.UserInfoSearch?.UserInfo;
            if (!person.ok || !Array.isArray(matches) || matches.length !== 1 ||
                String(matches[0].employeeNo) !== employeeNo || matches[0].userType !== 'normal') {
                throw fail(409, 'QR_USER_NOT_PROVISIONED', 'Resident is not provisioned on every QR access device');
            }
            let encryptionResult;
            try { encryptionResult = await api.configureEncryption(target.adapter, encryption.key, encryption.vector); }
            catch { throw fail(502, 'QR_DEVICE_UNREACHABLE', 'Could not configure QR encryption on every access device'); }
            if (!encryptionResult.ok || (encryptionResult.data?.statusCode !== undefined && Number(encryptionResult.data.statusCode) !== 1)) {
                throw fail(422, 'QR_ENCRYPTION_REJECTED', 'An access device rejected QR encryption configuration');
            }
        }
        let result;
        try { result = await api.issue(ctx.adapter, employeeNo, valid, times); }
        catch { throw fail(502, 'QR_ISSUANCE_UNCERTAIN', 'The QR response was lost; wait before renewing'); }
        const qrCode = result.data?.QRCodeInfo?.QRCodeString;
        if (!result.ok || typeof qrCode !== 'string' || !qrCode.length || qrCode.length > 2048) {
            throw fail(422, 'QR_DEVICE_REJECTED', 'The access device rejected QR issuance');
        }
        const row = await repo.saveResidentCredential({
            userId: actor.userId,
            sourceDeviceId: device.device_id,
            employeeNo,
            qrPayload: encryptCredential(qrCode),
            validValue: valid,
            usageLimit: times,
        });
        return residentResponse(row);
    }
    async function deleteResidentCredential(actor) {
        if (!actor || actor.role !== 'resident') throw fail(403, 'FORBIDDEN', 'Forbidden');
        uuid(actor.userId, 'Authenticated userId');
        const deleted = await repo.deleteResidentCredential(actor.userId);
        return {
            success: true,
            deleted,
            revokedOnDevice: false,
            warning: 'Previously saved QR images remain usable until their device validity ends.',
        };
    }
    return { getCapabilities, issue, getResidentCredential, issueResidentCredential, deleteResidentCredential };
}

module.exports = { ...createService(), createService };
