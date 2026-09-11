// Read-only attribution/capability check. Never prints PINs or credentials.
require('dotenv').config({ quiet: true });
const base = process.cwd();
const pool = require(base + '/database/db');
(async () => {
    const result = await pool.query(`SELECT ae.occurred_at, ae.status,
        ae.metadata->>'method' AS method, ae.metadata->>'subjectName' AS subject_name,
        (ae.actor_user_id IS NOT NULL) AS identified
        FROM activity_event ae JOIN device d ON d.device_id=ae.device_id
        WHERE d.ip_address='192.168.0.75' AND ae.source='hikvision_access'
        ORDER BY ae.created_at DESC LIMIT 3`);
    console.log(JSON.stringify(result.rows));
    const devices = await require(base + '/repositories/accessEventRepository').findSyncableIntercoms(true);
    const device = devices.find(d => d.ip_address === '192.168.0.75');
    const adapter = await require(base + '/services/vohk_app/hikvision/adapterFactory').getAdapterForIntercom(device);
    const response = await adapter.fetch('/ISAPI/AccessControl/UserInfo/capabilities?format=json', { signal: AbortSignal.timeout(15000) });
    const caps = await response.json();
    const relevant = [];
    function walk(value, path = '') {
        if (!value || typeof value !== 'object') return;
        for (const [key, child] of Object.entries(value)) {
            const name = path ? `${path}.${key}` : key;
            if (/password|dynamicCode|verifyMode/i.test(key)) relevant.push({field:name, capability:child});
            else walk(child, name);
        }
    }
    walk(caps);
    console.log(JSON.stringify({capabilityStatus:response.status, relevant}));
})().catch(e => console.log({ error: e.name, code: e.code })).finally(() => pool.end());
