const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function startVohkWorker() {
    const { startDeviceHeartbeat } = require('../jobs/deviceHeartbeat');
    const { startInvitationExpiration } = require('../jobs/invitationExpiration');
    const { startAccessEventSync } = require('../jobs/accessEventSync');
    const { startEncomiendaReminder } = require('../jobs/encomiendaReminder');
    const { startEncomiendaAdminAlert } = require('../jobs/encomiendaAdminAlert');
    startDeviceHeartbeat();
    startInvitationExpiration();
    startAccessEventSync();
    startEncomiendaReminder();
    startEncomiendaAdminAlert();
    console.log('[vohk-worker] Scheduled jobs started');
}

if (require.main === module) startVohkWorker();

module.exports = { startVohkWorker };
