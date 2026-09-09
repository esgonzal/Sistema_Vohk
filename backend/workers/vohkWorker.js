const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function startVohkWorker() {
    const { startDeviceHeartbeat } = require('../jobs/deviceHeartbeat');
    const { startInvitationExpiration } = require('../jobs/invitationExpiration');
    const { startAccessEventSync } = require('../jobs/accessEventSync');
    startDeviceHeartbeat();
    startInvitationExpiration();
    startAccessEventSync();
    console.log('[vohk-worker] Scheduled jobs started');
}

if (require.main === module) startVohkWorker();

module.exports = { startVohkWorker };
