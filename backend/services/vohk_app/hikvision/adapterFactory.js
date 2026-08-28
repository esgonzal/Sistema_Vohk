const HikvisionAdapter = require('./HikvisionAdapter');
const K1t343Adapter = require('./K1t343Adapter');

const KV9503_MODELS = new Set(['DS-KV9503-WBE1']);
const K1T343_MODELS = new Set([
    'DS-K1T343MX',
    'DS-K1T343MWX',
    'DS-K1T343MFX',
    'DS-K1T343MFWX',
    'DS-K1T343EX',
    'DS-K1T343EWX',
    'DS-K1T343EFX',
    'DS-K1T343EFWX',
]);

function normalizeModel(model) {
    return String(model || '').trim().toUpperCase();
}

function createAdapter(intercom, client) {
    const model = normalizeModel(intercom.model);
    if (!model || KV9503_MODELS.has(model)) {
        return new HikvisionAdapter(intercom, client);
    }
    if (K1T343_MODELS.has(model)) {
        return new K1t343Adapter(intercom, client);
    }
    const error = new Error(`Unsupported Hikvision intercom model: ${intercom.model}`);
    error.status = 422;
    throw error;
}

async function getAdapterForIntercom(intercom) {
    const DigestFetch = (await import('digest-fetch')).default;
    const client = new DigestFetch(intercom.username, intercom.password_encrypted);
    return createAdapter(intercom, client);
}

function getProfileForModel(model) {
    const normalized = normalizeModel(model);
    if (!normalized) {
        return { profile: null, storedAccessEvents: false, supported: false };
    }
    if (!KV9503_MODELS.has(normalized) && !K1T343_MODELS.has(normalized)) {
        return { profile: null, storedAccessEvents: false, supported: false };
    }
    const adapter = createAdapter({ model }, null);
    return {
        profile: adapter.profile,
        storedAccessEvents: adapter.supportsStoredAccessEvents,
        supported: true,
    };
}

module.exports = { createAdapter, getAdapterForIntercom, getProfileForModel, normalizeModel };
