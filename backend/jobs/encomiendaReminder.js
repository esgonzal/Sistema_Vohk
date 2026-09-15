const cron = require('node-cron');
const encomiendaService = require('../services/vohk_app/encomiendaService');

function startEncomiendaReminder() {
    cron.schedule('0 * * * *', async () => {
        try {
            await encomiendaService.processReminders();
        } catch (error) {
            console.error('[ENCOMIENDA REMINDER]', error);
        }
    });
}

module.exports = { startEncomiendaReminder };
