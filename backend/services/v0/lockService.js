const ekeyService = require('./ekeyService');
const passcodeService = require('./passcodeService');
const cardService = require('./cardService');
const fingerprintService = require('./fingerprintService');
const recordService = require('./recordService');

const getLockDashboard = async ({ accessToken, lockID }) => {
    try {
        const [ekeys, passcodes, cards, fingerprints, records] = await Promise.all([
            ekeyService.getLockEkeys({ accessToken, lockID }),
            passcodeService.getLockPasscodes({ accessToken, lockID }),
            cardService.getLockCards({ accessToken, lockID }),
            fingerprintService.getLockFingerprints({ accessToken, lockID }),
            recordService.getLockRecords({ accessToken, lockID })
        ]);
        return { ekeys: ekeys.list || [], passcodes: passcodes.list || [], cards: cards.list || [], fingerprints: fingerprints.list || [], records: records.list || [] };
    } catch (error) {
        throw error;
    }
};

module.exports = { getLockDashboard };