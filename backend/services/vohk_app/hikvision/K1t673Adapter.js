const K1t343Adapter = require('./K1t343Adapter');

// The DS-K1T673 V4 firmware exposes the same MinMoe access-control contract
// used by the K1T343 adapter: hierarchical call numbers, explicit door plans,
// phone records, face/card/PIN provisioning, and stored AcsEvent searches.
// Keep a distinct profile so model-specific differences can be introduced
// without changing the already deployed K1T343 behavior.
class K1t673Adapter extends K1t343Adapter {
    constructor(intercom, client) {
        super(intercom, client);
        this.profile = 'hikvision-minmoe-k1t673-v4';
    }
}

module.exports = K1t673Adapter;
