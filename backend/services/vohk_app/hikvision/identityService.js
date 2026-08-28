const { parseDeviceInfo } = require('./xml');
const { getProfileForModel } = require('./adapterFactory');

async function fetchHikvisionIdentity(device) {
    if (!device.username || (!device.password_encrypted && !device.password)) {
        throw new Error(`Missing credentials for ${device.name}`);
    }
    const DigestFetch = (await import('digest-fetch')).default;
    const client = new DigestFetch(device.username, device.password_encrypted || device.password);
    const response = await client.fetch(
        `http://${device.ip_address}:${device.port}/ISAPI/System/deviceInfo`,
        { method: 'GET', headers: { Accept: 'application/xml' } },
    );
    if (!response.ok) {
        const error = new Error(`Device identity request failed with HTTP ${response.status}`);
        error.status = 502;
        throw error;
    }
    const identity = parseDeviceInfo(await response.text());
    if (!identity.model) {
        const error = new Error('Hikvision deviceInfo did not include a model');
        error.status = 502;
        throw error;
    }
    const capabilities = getProfileForModel(identity.model);
    return { ...identity, capabilities };
}

module.exports = { fetchHikvisionIdentity };
