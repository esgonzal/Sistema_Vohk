const K1t343Adapter = require('./K1t343Adapter');

// The DS-K1T323 E1 firmware uses the same MinMoe V4 contracts validated for
// resident/PIN provisioning, door rights, phone records and stored events.
// QR credential generation is deliberately handled separately because the
// non-QR model does not expose QRCodeInfo or QRCodeEncryption.
class K1t323Adapter extends K1t343Adapter {
    constructor(intercom, client) {
        super(intercom, client);
        this.profile = 'hikvision-minmoe-k1t323-v4';
    }
}

module.exports = K1t323Adapter;
