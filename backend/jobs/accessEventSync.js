const cron = require('node-cron');
const { syncAllAccessEvents } = require('../services/vohk_app/accessEventSyncService');
const { syncAllTtlockPasscodeRecords } = require('../services/vohk_app/ttlockPasscodeRecordSyncService');

let running = false;

async function runAccessEventSync() {
    if (running) return;
    running = true;
    try {
        await syncAllAccessEvents();
        await syncAllTtlockPasscodeRecords();
    } finally {
        running = false;
    }
}

function startAccessEventSync() {
    setImmediate(() => runAccessEventSync().catch(error => console.error('[ACCESS EVENT SYNC]', error)));
    cron.schedule('* * * * *', () => {
        runAccessEventSync().catch(error => console.error('[ACCESS EVENT SYNC]', error));
    });
}

module.exports = { startAccessEventSync, runAccessEventSync };
