const pool = require('../database/db');

async function findSyncableIntercoms() {
    const result = await pool.query(`
        SELECT d.device_id, d.name, d.model, d.firmware_version, d.ip_address,
               d.port, d.username, d.password_encrypted, i.intercom_id,
               i.door_id, i.dial_period_number, i.dial_building_number,
               i.dial_unit_number, z.condominium_id
        FROM device d
        INNER JOIN intercom i ON i.device_id = d.device_id
        INNER JOIN zone z ON z.zone_id = d.zone_id
        WHERE d.active = TRUE
          AND LOWER(d.vendor) = 'hikvision'
          AND UPPER(COALESCE(d.model, '')) LIKE 'DS-K1T343%'
        ORDER BY d.device_id
    `);
    return result.rows;
}

async function findLatestEventTime(deviceId) {
    const result = await pool.query(`
        SELECT MAX(occurred_at) AS occurred_at
        FROM activity_event
        WHERE device_id = $1
          AND event_type = 'access'
          AND source = 'hikvision_access'
    `, [deviceId]);
    return result.rows[0]?.occurred_at || null;
}

async function resolveEventSubject(deviceId, employeeNo, occurredAt) {
    if (!employeeNo) return null;
    const result = await pool.query(`
        WITH resident_match AS (
            SELECT iu.user_id AS actor_user_id,
                   au.legal_name AS subject_name,
                   NULL::uuid AS owner_user_id,
                   'resident'::text AS subject_type,
                   1 AS priority
            FROM intercom_user iu
            INNER JOIN intercom i ON i.intercom_id = iu.intercom_id
            INNER JOIN app_user au ON au.user_id = iu.user_id
            WHERE i.device_id = $1 AND iu.employee_no = $2
        ), invitation_match AS (
            SELECT NULL::uuid AS actor_user_id,
                   COALESCE(v.name, 'Visita') AS subject_name,
                   inv.resident_user_id AS owner_user_id,
                   'visitor'::text AS subject_type,
                   2 AS priority
            FROM invitation inv
            INNER JOIN invitation_device idv
                    ON idv.invitation_id = inv.invitation_id
                   AND idv.device_id = $1
            LEFT JOIN visitor v ON v.visitor_id = inv.visitor_id
            WHERE inv.hikvision_employee_no = $2
              AND inv.valid_from <= $3
              AND (inv.valid_until IS NULL OR inv.valid_until >= $3)
            ORDER BY inv.created_at DESC
            LIMIT 1
        )
        SELECT actor_user_id, subject_name, owner_user_id, subject_type
        FROM (
            SELECT * FROM resident_match
            UNION ALL
            SELECT * FROM invitation_match
        ) matches
        ORDER BY priority
        LIMIT 1
    `, [deviceId, String(employeeNo), occurredAt]);
    return result.rows[0] || null;
}

module.exports = { findSyncableIntercoms, findLatestEventTime, resolveEventSubject };
