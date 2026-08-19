const pool = require('../database/db');

async function getSummary(adminUserId) {
    const result = await pool.query(`
        SELECT COUNT(DISTINCT c.condominium_id)::int AS condominiums, COUNT(DISTINCT b.building_id)::int AS buildings, COUNT(DISTINCT u.unit_id)::int AS units, COUNT(DISTINCT ru.user_id)::int AS residents, COUNT(DISTINCT d.device_id)::int AS devices, COUNT(DISTINCT i.intercom_id)::int AS intercoms, COUNT(DISTINCT CASE WHEN d.type = 'camera' THEN d.device_id END)::int AS cameras
        FROM condominium c
        LEFT JOIN building b ON b.condominium_id = c.condominium_id
        LEFT JOIN unit u ON u.building_id = b.building_id
        LEFT JOIN resident_unit ru ON ru.unit_id = u.unit_id
        LEFT JOIN zone z ON z.condominium_id = c.condominium_id
        LEFT JOIN device d ON d.zone_id = z.zone_id
        LEFT JOIN intercom i ON i.device_id = d.device_id
        WHERE ($1::uuid IS NULL OR c.admin_user_id = $1)
    `, [adminUserId]);
    return result.rows[0];
}

async function getCondominiums(adminUserId) {
    const result = await pool.query(`
        SELECT c.condominium_id, c.name, c.address, c.city, c.resident_camera_access, COUNT(DISTINCT b.building_id)::int AS buildings, COUNT(DISTINCT u.unit_id)::int AS units, COUNT(DISTINCT ru.user_id)::int AS residents, COUNT(DISTINCT d.device_id)::int AS devices
        FROM condominium c
        LEFT JOIN building b ON b.condominium_id = c.condominium_id
        LEFT JOIN unit u ON u.building_id = b.building_id
        LEFT JOIN resident_unit ru ON ru.unit_id = u.unit_id
        LEFT JOIN zone z ON z.condominium_id = c.condominium_id
        LEFT JOIN device d ON d.zone_id = z.zone_id
        WHERE ($1::uuid IS NULL OR c.admin_user_id = $1)
        GROUP BY c.condominium_id, c.name, c.address, c.city, c.resident_camera_access
        ORDER BY c.name
    `, [adminUserId]);
    return result.rows;
}

async function getDeviceSummary(adminUserId) {
    const result = await pool.query(`
        SELECT COUNT(DISTINCT d.device_id)::int AS total, COUNT(DISTINCT d.device_id) FILTER (WHERE d.last_seen_at >= NOW() - INTERVAL '5 minutes')::int AS online, COUNT(DISTINCT d.device_id) FILTER (WHERE d.last_seen_at < NOW() - INTERVAL '5 minutes' OR d.last_seen_at IS NULL)::int AS offline, COUNT(DISTINCT d.device_id) FILTER (WHERE d.type = 'camera')::int AS cameras, COUNT(DISTINCT d.device_id) FILTER (WHERE d.type = 'camera' AND d.last_seen_at >= NOW() - INTERVAL '5 minutes')::int AS cameras_online, COUNT(DISTINCT d.device_id) FILTER (WHERE d.type = 'intercom')::int AS intercoms, COUNT(DISTINCT d.device_id) FILTER (WHERE d.type = 'intercom' AND d.last_seen_at >= NOW() - INTERVAL '5 minutes')::int AS intercoms_online
        FROM device d
        INNER JOIN zone z ON z.zone_id = d.zone_id
        INNER JOIN condominium c ON c.condominium_id = z.condominium_id
        WHERE ($1::uuid IS NULL OR c.admin_user_id = $1)
    `, [adminUserId]);
    return result.rows[0];
}

async function getRecentResidents(adminUserId) {
    const result = await pool.query(`
        SELECT recent.user_id, recent.legal_name, recent.email, recent.condominium, recent.created_at
        FROM (
            SELECT DISTINCT ON (u.user_id) u.user_id, u.legal_name, u.email, c.name AS condominium, u.created_at
            FROM app_user u
            INNER JOIN resident_unit ru ON ru.user_id = u.user_id
            INNER JOIN unit un ON un.unit_id = ru.unit_id
            INNER JOIN building b ON b.building_id = un.building_id
            INNER JOIN condominium c ON c.condominium_id = b.condominium_id
            WHERE ($1::uuid IS NULL OR c.admin_user_id = $1)
            ORDER BY u.user_id, u.created_at DESC
        ) recent
        ORDER BY recent.created_at DESC
        LIMIT 5
    `, [adminUserId]);
    return result.rows;
}

async function getRecentCondominiums(adminUserId) {
    const result = await pool.query(`
        SELECT condominium_id, name, city, created_at
        FROM condominium
        WHERE ($1::uuid IS NULL OR admin_user_id = $1)
        ORDER BY created_at DESC
        LIMIT 5
    `, [adminUserId]);
    return result.rows;
}

module.exports = { getSummary, getCondominiums, getDeviceSummary, getRecentResidents, getRecentCondominiums };