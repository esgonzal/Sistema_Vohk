const cron = require('node-cron');
const invitationService = require('../services/vohk_app/invitationService');

function startInvitationExpiration() {
    cron.schedule('* * * * *', async () => {
        try {
            await invitationService.processExpiredInvitations();
        } catch (error) {
            console.error('[INVITATION EXPIRATION]', error);
        }
    });
}

module.exports = { startInvitationExpiration };