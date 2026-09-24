const deviceRepository = require('../../repositories/deviceRepository');
const { fetchHikvisionIdentity } = require('./hikvision/identityService');
const ttlockClient = require('../../integrations/ttlock/ttlockClient');

async function checkDevices() {
    const devices = await deviceRepository.findActiveDevices();
    for (const device of devices) {
        try {
            const online = await checkDevice(device);
            if (online) {
                await deviceRepository.updateLastSeen(device.device_id);
            }
        } catch (error) {
            console.error(`Device ${device.name} check failed`, error.message);
        }
    }
}
async function checkDevice(device) {
    switch (String(device.vendor || '').toLowerCase()) {
        case 'hikvision':
            return checkHikvisionDevice(device);
        case 'dahua':
            return checkDahuaDevice(device);
        case 'ttlock':
            return checkTtlockDevice(device);
        default:
            console.error(`Unsupported device vendor: ${device.vendor}`);
            return false;
    }
}
async function checkHikvisionDevice(device) {
    if (!device.username || !device.password) {
        console.error(`Missing credentials for ${device.name}`);
        return false;
    }
    const identity = await fetchHikvisionIdentity(device);
    await deviceRepository.updateDeviceIdentity(device.device_id, identity);
    return true;
}
async function checkDahuaDevice(device) {
    if (!device.username || !device.password) {
        console.error(`Missing credentials for ${device.name}`);
        return false;
    }
    const DigestFetch = (await import('digest-fetch')).default;
    const client = new DigestFetch(device.username, device.password);
    const url = `http://${device.ip_address}:${device.port}/cgi-bin/magicBox.cgi?action=getSystemInfo`;
    const response = await client.fetch(url, {method: 'GET'});
    return response.ok;
}

async function checkTtlockDevice(device) {
    if (!device.ttlock_external_lock_id) {
        console.error(`Missing TTLock ID for ${device.name}`);
        return false;
    }
    await ttlockClient.queryOpenState(device.ttlock_external_lock_id);
    return true;
}

module.exports = { checkDevices, _private: { checkDevice } };
