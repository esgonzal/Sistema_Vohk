const repository = require('../../repositories/hikvisionQrRepository');
const { getAdapterForIntercom, normalizeModel } = require('./hikvision/adapterFactory');
const qrApi = require('./hikvision/qrApi');
const QRCode = require('qrcode');

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
        if (!['DS-KV9503-WBE1', 'DS-K1T343MWX'].includes(model)) {
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
            verification: { issuance: ctx.model === 'DS-KV9503-WBE1' ? 'observed' : 'unconfirmed',
                physicalAccess: 'unconfirmed', eventAttribution: 'unconfirmed' } };
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
    return { getCapabilities, issue };
}

module.exports = { ...createService(), createService };
