const express = require('express');
const router = express.Router();

const DEVICES = {
    main: {
        ip: '201.186.166.84',
        port: '8015',
        user: 'admin',
        pass: 'vohk2024',
        doorId: 1,
    },
    secondary: {
        ip: '201.186.166.84',
        port: '8014',
        user: 'admin',
        pass: 'vohk2024',
        doorId: 1,
    },
};

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