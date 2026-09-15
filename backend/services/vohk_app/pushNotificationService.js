const admin = require('firebase-admin');
const userDeviceRepository = require('../../repositories/userDeviceRepository');

function ensureFirebase() {
    if (admin.apps.length) return;
    const serviceAccount = require('../../firebase/firebase-service-account.json');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

async function sendToUsers(userIds, message) {
    ensureFirebase();
    const devices = (await Promise.all([...new Set(userIds)].map(id => userDeviceRepository.findActiveByUserId(id)))).flat();
    if (!devices.length) return { sent: 0 };
    let sent = 0;
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
            const code = item.error?.code;
            if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
                await userDeviceRepository.deactivateDeviceById(batch[index].user_device_id);
            }
        }));
    }
    return { sent };
}

module.exports = { sendToUsers };
