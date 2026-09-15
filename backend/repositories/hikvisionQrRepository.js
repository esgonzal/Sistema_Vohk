const pool = require('../database/db');

// Authorization is part of the query, before credentials can reach a device adapter.
async function findManagedDevice(deviceId, userId, role) {
    if (!['admin', 'superadmin'].includes(role)) return null;
    const { rows } = await pool.query(`
        SELECT d.device_id, d.model, d.firmware_version, d.firmware_build,
               d.ip_address, d.port, d.username, d.password_encrypted,
               i.intercom_id, i.door_id, z.condominium_id
        FROM device d
        JOIN intercom i ON i.device_id = d.device_id
        JOIN zone z ON z.zone_id = d.zone_id
        JOIN condominium c ON c.condominium_id = z.condominium_id
        WHERE d.device_id = $1 AND d.active = TRUE AND LOWER(d.vendor) = 'hikvision'
          AND ($3 = 'superadmin' OR c.admin_user_id = $2::uuid)
    `, [deviceId, userId, role]);
    return rows[0] || null;
}

async function findRegisteredUser(deviceId, userId) {
    const { rows } = await pool.query(`
        SELECT iu.employee_no, iu.user_id
        FROM intercom_user iu
        JOIN intercom i ON i.intercom_id = iu.intercom_id
        JOIN app_user au ON au.user_id = iu.user_id
        WHERE i.device_id = $1 AND iu.user_id = $2
    `, [deviceId, userId]);
    return rows.length === 1 ? rows[0] : null;
}

module.exports = { findManagedDevice, findRegisteredUser };
