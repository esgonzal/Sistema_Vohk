const deviceRepository = require('../../repositories/deviceRepository');

async function checkDevices() {
    const devices = await deviceRepository.findActiveDevices();
    for (const device of devices) {
        try {
            const online = await checkHikvisionDevice(device);
            if (online) {
                await deviceRepository.updateLastSeen(device.device_id);
            }
        } catch (error) {
            console.error(`Device ${device.name} check failed`, error.message);
        }
    }
}

async function checkHikvisionDevice(device) {
    if (!device.username || !device.password) {
        console.error(`Missing credentials for ${device.name}`);
        return false;
    }
    const DigestFetch = (await import('digest-fetch')).default;
    const client = new DigestFetch(device.username, device.password);
    const url = `http://${device.ip_address}:${device.port}/ISAPI/System/deviceInfo`;
    const response = await client.fetch(url, { method: 'GET', headers: { Accept: 'application/xml' } });
    return response.ok;
}

module.exports = { checkDevices };
