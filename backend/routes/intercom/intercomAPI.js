const express = require('express');
const router = express.Router();

const DEVICES = {
    main: {
        name: 'Entrada Principal',
        ip: '201.186.166.84',
        port: '8015',
        sip: 'sip:vp-01-vohk@vohk-porteria.sip.us1.twilio.com;transport=tcp',
        snapshot: 'https://api.vohk.cl/snapshots/cam5.jpg',
        streamUrl: 'https://api.vohk.cl/cam5/',
        user: 'admin',
        pass: 'vohk2024',
        doorId: 1,
    },
    secondary: {
        name: 'Entrada Secundaria',
        ip: '201.186.166.84',
        port: '8014',
        sip: 'sip:vp-02-vohk@vohk-porteria.sip.us1.twilio.com;transport=tcp', //Doesnt exist yet, only vp-01 is registered in twilio
        snapshot: 'https://api.vohk.cl/snapshots/cam4.jpg',
        streamUrl: 'https://api.vohk.cl/cam4/',
        user: 'admin',
        pass: 'vohk2024',
        doorId: 1,
    },
};

router.get('/intercoms', (req, res) => {
    const list = Object.entries(DEVICES).map(([id, d]) => ({
        id,
        name: d.name,
        snapshot: d.snapshot,
        url: d.streamUrl
    }));
    res.json(list);
});
router.post('/open-door/:device', async (req, res) => {
    try {
        const deviceName = req.params.device;
        const INTERCOM = DEVICES[deviceName];
        if (!INTERCOM) {

            return res.status(404).json({
                ok: false,
                error: 'Device not found',
            });
        }
        const DigestFetch = (await import('digest-fetch')).default;
        const client = new DigestFetch(
            INTERCOM.user,
            INTERCOM.pass
        );
        const path = `/ISAPI/AccessControl/RemoteControl/door/${INTERCOM.doorId}`;
        const url = `http://${INTERCOM.ip}:${INTERCOM.port}${path}`;
        const xml =
            `<?xml version="1.0" encoding="UTF-8"?>
                <RemoteControlDoor>
                    <cmd>open</cmd>
                </RemoteControlDoor>`;

        console.log('[INTERCOM] Opening door...');
        const response = await client.fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/xml', },
            body: xml,
        });
        const text = await response.text();
        //console.log('[INTERCOM] Response:', text);
        if (response.ok) {
            return res.json({
                ok: true,
                message: 'Door opened',
            });
        }
        return res.status(500).json({
            ok: false,
            error: text,
        });
    } catch (error) {
        console.error('[INTERCOM ERROR]', error);
        return res.status(500).json({
            ok: false,
            error: error.message,
        });
    }
});

module.exports = router;