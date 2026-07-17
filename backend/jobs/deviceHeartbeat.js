const cron = require('node-cron');
const { checkDevices } = require('../services/vohk_app/deviceMonitorService');

function startDeviceHeartbeat() {
    cron.schedule('*/5 * * * *', async () => {
        console.log('Running device heartbeat');
        await checkDevices();
    });
}

module.exports = { startDeviceHeartbeat };