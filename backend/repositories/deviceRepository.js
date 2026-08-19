const pool = require('../database/db');

async function findIntercoms() {
    const result = await pool.query(`
        SELECT *
        FROM device
        WHERE type = 'intercom'
    `);
    return result.rows;
}
async function findCameras() {
    const result = await pool.query(`
        SELECT *
        FROM device
        WHERE type = 'camera'
    `);
    return result.rows;
}
async function findDeviceTreeRows(condominiumId) {
    const result = await pool.query(`
        SELECT
            c.condominium_id,
            c.name AS condominium_name,
            c.address,
            c.city,
            z.zone_id,
            z.name AS zone_name,
            d.device_id,
            d.type,
            d.name AS device_name,
            d.ip_address,
            d.port,
            d.username,
            d.password_encrypted,
            d.snapshot_url,
            d.stream_url,
            d.active,
            d.last_seen_at,
            d.created_at AS device_created_at,
            i.intercom_id,
            i.sip_address,
            i.door_id
        FROM condominium c
        LEFT JOIN zone z ON z.condominium_id = c.condominium_id
        LEFT JOIN device d ON d.zone_id = z.zone_id
        LEFT JOIN intercom i ON i.device_id = d.device_id
        WHERE c.condominium_id = $1
        ORDER BY z.name, d.type, d.name
    `, [condominiumId]);
    return result.rows;
}
async function findIntercomByDeviceId(deviceId) {
    const result = await pool.query(
        `
        SELECT
            d.device_id,
            d.name,
            d.ip_address,
            d.port,
            d.username,
            d.password_encrypted,
            i.door_id,
            z.condominium_id
        FROM device d
        JOIN intercom i
            ON i.device_id = d.device_id
        JOIN zone z
            ON z.zone_id = d.zone_id
        WHERE d.device_id = $1
        `,
        [deviceId]
    );
    return result.rows[0];
}
async function findDevicesByZone(zoneId) {
    const result = await pool.query(
        `
        SELECT
            d.*,
            z.name AS zone_name,
            i.intercom_id,
            i.sip_address,
            d.username,
            d.password_encrypted,
            i.door_id
        FROM device d
        JOIN zone z
            ON z.zone_id = d.zone_id
        LEFT JOIN intercom i
            ON i.device_id = d.device_id
        WHERE d.zone_id = $1
        ORDER BY d.type, d.name
        `,
        [zoneId]
    );
    return result.rows;
}
async function findDevicesByCondominium(condominiumId, zoneId = null) {
    if (zoneId) {
        const result = await pool.query(
            `
            SELECT
                d.*,
                z.name,
                i.intercom_id,
                i.sip_address,
                i.door_id
            FROM device d
            JOIN zone z ON z.zone_id = d.zone_id
            LEFT JOIN intercom i ON i.device_id = d.device_id
            WHERE z.condominium_id = $1 AND d.zone_id = $2
            ORDER BY d.type, d.name
            `,
            [condominiumId, zoneId]
        );
        return result.rows;
    }
    const result = await pool.query(
        `
        SELECT
            d.*,
            z.name,
            i.intercom_id,
            i.sip_address,
            i.door_id
        FROM device d
        JOIN zone z ON z.zone_id = d.zone_id
        LEFT JOIN intercom i ON i.device_id = d.device_id
        WHERE z.condominium_id = $1
        ORDER BY z.name, d.type, d.name
        `,
        [condominiumId]
    );
    return result.rows;
}
async function findMobileDevicesByCondominium(condominiumId) {
    const result = await pool.query(
        `
        SELECT
            d.device_id,
            d.zone_id,
            d.type,
            d.name,
            d.snapshot_url,
            d.stream_url,
            d.active,
            d.last_seen_at,
            z.name AS zone_name,
            i.intercom_id,
            i.door_id
        FROM device d
        INNER JOIN zone z ON z.zone_id = d.zone_id
        LEFT JOIN intercom i ON i.device_id = d.device_id
        WHERE z.condominium_id = $1 AND d.active = TRUE
        ORDER BY z.name, d.type, d.name
        `,
        [condominiumId]
    );
    return result.rows;
}
async function findActiveDevices() {
    const query = `
        SELECT
            device_id,
            type,
            vendor,
            name,
            ip_address,
            port,
            username,
            password_encrypted AS password
        FROM device
        WHERE active = true
    `;
    const result = await pool.query(query);
    return result.rows;
}
async function findDeviceByIdAndAdmin(deviceId, adminUserId) {
    const result = await pool.query(`
        SELECT d.*
        FROM device d
        JOIN zone z ON z.zone_id = d.zone_id
        JOIN condominium c ON c.condominium_id = z.condominium_id
        WHERE d.device_id = $1 AND c.admin_user_id = $2
    `, [deviceId, adminUserId]);
    return result.rows[0];
}
async function createDevice({ zoneId, type, name, ipAddress, port, username, passwordEncrypted, snapshotUrl, streamUrl, active = true }) {
    const result = await pool.query(
        `
        INSERT INTO device (zone_id, type, name, ip_address, port, username, password_encrypted, snapshot_url, stream_url, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
        `,
        [zoneId, type, name, ipAddress, port, username, passwordEncrypted, snapshotUrl, streamUrl, active]
    );
    return result.rows[0];
}
async function updateDeviceName(deviceId, name) {
    const result = await pool.query(`
        UPDATE device
        SET name = $2
        WHERE device_id = $1
        RETURNING *
    `, [deviceId, name]);
    return result.rows[0];
}
async function deleteDevice(deviceId) {
    const result = await pool.query(
        `
        DELETE FROM device
        WHERE device_id = $1
        RETURNING *
        `,
        [deviceId]
    );
    return result.rows[0];
}
async function moveDeviceToZone(deviceId, zoneId) {
    const result = await pool.query(
        `
        UPDATE device
        SET zone_id = $2
        WHERE device_id = $1
        RETURNING *
        `,
        [deviceId, zoneId]
    );
    return result.rows[0];
}
async function updateLastSeen(deviceId) {
    const query = `
        UPDATE device
        SET last_seen_at = NOW()
        WHERE device_id = $1
    `;
    await pool.query(query, [deviceId]);
}

module.exports = {
    findIntercoms, findCameras, findDeviceTreeRows, findIntercomByDeviceId, findDevicesByZone, findDevicesByCondominium, findMobileDevicesByCondominium, findActiveDevices, findDeviceByIdAndAdmin,
    createDevice, updateDeviceName, deleteDevice, moveDeviceToZone, updateLastSeen
};
