// Read-only operator tool. QR issuance belongs to the authenticated HTTP API.
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });

async function main() {
    const [mode, deviceId, duration = '30'] = process.argv.slice(2);
    const seconds = Number(duration);
    if (!['inspect', 'capture', 'activities'].includes(mode) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deviceId || '') ||
        !Number.isInteger(seconds) || seconds < 1 || seconds > 60) {
        throw new Error('Usage: node scripts/hikvision-diagnostics.cjs inspect|capture|activities DEVICE_UUID [1-60 seconds]');
    }
    const pool = require('../database/db');
    pool.options.connectionTimeoutMillis = 10000;
    pool.options.query_timeout = 15000;
    try {
        const device = await require('../repositories/deviceRepository').findIntercomByDeviceId(deviceId);
        if (!device || String(device.vendor).toLowerCase() !== 'hikvision') throw new Error('Hikvision device not found');
        if (mode === 'activities') {
            const rows = await require('../repositories/accessEventRepository').findRecentDeviceActivities(deviceId);
            console.log(JSON.stringify(rows, null, 2));
            return;
        }
        const adapter = await require('../services/vohk_app/hikvision/adapterFactory').getAdapterForIntercom(device);
        if (mode === 'inspect') {
            const result = await require('../services/vohk_app/hikvision/qrApi').getCapabilities(adapter);
            const cap = result.data?.QRCodeInfoCap;
            console.log(JSON.stringify({ model: device.model, firmware: device.firmware_version,
                storedAccessEvents: adapter.supportsStoredAccessEvents, status: result.status,
                qrLimits: cap ? Object.fromEntries(['employeeNo', 'valid', 'times'].map(k => [k, {
                    min: cap[k]?.['@min'], max: cap[k]?.['@max'],
                }])) : null }, null, 2));
            if (!result.ok) process.exitCode = 1;
            return;
        }
        const { jsonEventParts } = require('../services/vohk_app/hikvision/eventStream');
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), seconds * 1000);
        try {
            const response = await adapter.fetch('/ISAPI/Event/notification/alertStream', { signal: controller.signal });
            if (!response.ok) throw new Error(`Event stream HTTP ${response.status}`);
            console.log(JSON.stringify({ listening: true, seconds, deviceId, databaseWrites: 0 }));
            let count = 0;
            for await (const event of jsonEventParts(response.body, response.headers.get('content-type'))) {
                if (event.eventType !== 'AccessControllerEvent' && event.eventType !== 'QRCodeEvent') continue;
                const detail = event.AccessControllerEvent || event.QRCodeEvent || {};
                console.log(JSON.stringify({ eventType: event.eventType, time: event.dateTime,
                    major: detail.majorEventType, minor: detail.subEventType, currentEvent: detail.currentEvent,
                    hasEmployee: Boolean(detail.employeeNoString || detail.employeeNo),
                    hasCard: Boolean(detail.cardNo), hasQr: Boolean(detail.QRCodeInfo), fields: Object.keys(detail) }));
                if (++count >= 100) break;
            }
        } catch (error) { if (!controller.signal.aborted) throw error; }
        finally { clearTimeout(timer); controller.abort(); }
    } finally { await pool.end(); }
}
main().catch(() => {
    // Upstream errors can contain connection credentials: do not log exception objects.
    console.error('Diagnostics failed. Check mode/device UUID, database configuration and device connectivity. See deploy/HIKVISION_QR.md.');
    process.exitCode = 1;
});
