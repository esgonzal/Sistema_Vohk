const cron = require('node-cron');
const encomiendaService = require('../services/vohk_app/encomiendaService');

function startEncomiendaAdminAlert() {
    cron.schedule('*/5 * * * *', async () => {
        try {
            await encomiendaService.processAdminAlerts();
        } catch (error) {
            console.error('[ENCOMIENDA ADMIN ALERT]', error);
        }
    });
}

module.exports = { startEncomiendaAdminAlert };
