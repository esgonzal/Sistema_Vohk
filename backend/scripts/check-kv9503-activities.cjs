// Read-only recent activity check; intentionally excludes names and credentials.
require('dotenv').config({ quiet: true });
const pool = require(process.cwd() + '/database/db');
pool.query(`SELECT ae.event_type, ae.status, ae.source, ae.occurred_at, ae.created_at,
 ae.metadata->>'major' AS major, ae.metadata->>'minor' AS minor,
 ae.metadata->>'method' AS method, ae.metadata->>'offlineReplay' AS offline,
 (ae.actor_user_id IS NOT NULL) AS identified
 FROM activity_event ae JOIN device d ON d.device_id=ae.device_id
 WHERE d.ip_address='192.168.0.75' ORDER BY ae.created_at DESC LIMIT 20`)
 .then(r=>console.log(JSON.stringify(r.rows,null,2)))
 .catch(e=>console.log(e.message)).finally(()=>pool.end());
