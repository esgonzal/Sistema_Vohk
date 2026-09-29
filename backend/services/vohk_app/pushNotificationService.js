const admin = require('firebase-admin');
const userDeviceRepository = require('../../repositories/userDeviceRepository');

function ensureFirebase() {
    if (admin.apps.length) return;
    const serviceAccount = require('../../firebase/firebase-service-account.json');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

async function sendToUsers(userIds, message) {
    ensureFirebase();
    const uniqueUserIds = [...new Set(userIds)];
    const devices = (await Promise.all(uniqueUserIds.map(id => userDeviceRepository.findActiveByUserId(id)))).flat();
    if (!devices.length) {
        return { sent: 0, failed: 0, devices: 0, users: uniqueUserIds.length, errors: {} };
    }
    let sent = 0;
    let failed = 0;
    const errors = {};
    for (let offset = 0; offset < devices.length; offset += 500) {
        const batch = devices.slice(offset, offset + 500);
        const response = await admin.messaging().sendEachForMulticast({
            tokens: batch.map(device => device.fcm_token),
            notification: message.notification,
            data: message.data,
            android: { priority: 'high' },
            apns: { payload: { aps: { sound: 'default' } } },
        });
        sent += response.successCount;
        await Promise.all(response.responses.map(async (item, index) => {
            if (item.success) return;
            failed += 1;
            const code = item.error?.code || 'unknown';
            errors[code] = (errors[code] || 0) + 1;
            const device = batch[index];
            console.warn(`[PUSH] Firebase rejected device ${device.user_device_id} (${device.platform || 'unknown'}): ${code}`);
            if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
                await userDeviceRepository.deactivateDeviceById(device.user_device_id);
            }
        }));
    }
    return { sent, failed, devices: devices.length, users: uniqueUserIds.length, errors };
}

module.exports = { sendToUsers };
