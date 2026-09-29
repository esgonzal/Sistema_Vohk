const cron = require('node-cron');
const encomiendaService = require('../services/vohk_app/encomiendaService');

function startEncomiendaReminder() {
    // The database query enforces the one-hour interval. Checking every five
    // minutes keeps reminders close to that boundary instead of up to an hour late.
    cron.schedule('*/5 * * * *', async () => {
        try {
            await encomiendaService.processReminders();
        } catch (error) {
            console.error('[ENCOMIENDA REMINDER]', error);
        }
    });
}

module.exports = { startEncomiendaReminder };
