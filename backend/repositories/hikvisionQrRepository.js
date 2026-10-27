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

async function findResidentQrDevices(userId) {
    const { rows } = await pool.query(`
        SELECT d.device_id, d.model, d.firmware_version, d.firmware_build,
               d.ip_address, d.port, d.username, d.password_encrypted,
               i.intercom_id, i.door_id, z.condominium_id, iu.employee_no
        FROM intercom_user iu
        JOIN intercom i ON i.intercom_id = iu.intercom_id
        JOIN device d ON d.device_id = i.device_id
        JOIN zone z ON z.zone_id = d.zone_id
        WHERE iu.user_id = $1 AND d.active = TRUE
          AND LOWER(d.vendor) = 'hikvision'
          AND UPPER(TRIM(d.model)) = 'DS-K1T343MWX'
        ORDER BY d.created_at
    `, [userId]);
    return rows;
}

async function findResidentCredential(userId) {
    const { rows } = await pool.query(`
        SELECT user_id, source_device_id, employee_no, qr_payload,
               valid_value, usage_limit, issued_at, updated_at
        FROM resident_qr_credential
        WHERE user_id = $1
    `, [userId]);
    return rows[0] || null;
}

async function saveResidentCredential({ userId, sourceDeviceId, employeeNo, qrPayload, validValue, usageLimit }) {
    const { rows } = await pool.query(`
        INSERT INTO resident_qr_credential
            (user_id, source_device_id, employee_no, qr_payload, valid_value, usage_limit)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) DO UPDATE SET
            source_device_id = EXCLUDED.source_device_id,
            employee_no = EXCLUDED.employee_no,
            qr_payload = EXCLUDED.qr_payload,
            valid_value = EXCLUDED.valid_value,
            usage_limit = EXCLUDED.usage_limit,
            issued_at = NOW(),
            updated_at = NOW()
        RETURNING user_id, source_device_id, employee_no, qr_payload,
                  valid_value, usage_limit, issued_at, updated_at
    `, [userId, sourceDeviceId, employeeNo, qrPayload, validValue, usageLimit]);
    return rows[0];
}

async function deleteResidentCredential(userId) {
    const { rowCount } = await pool.query('DELETE FROM resident_qr_credential WHERE user_id = $1', [userId]);
    return rowCount > 0;
}

module.exports = {
    findManagedDevice,
    findRegisteredUser,
    findResidentQrDevices,
    findResidentCredential,
    saveResidentCredential,
    deleteResidentCredential,
};
