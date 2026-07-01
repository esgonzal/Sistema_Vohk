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
async function findIntercomBySipAddress(sipAddress) {
    const result = await pool.query(
        `
        SELECT
            d.device_id,
            d.zone_id,
            d.type,
            d.name,
            d.ip_address,
            d.port,
            d.snapshot_url,
            d.stream_url,
            d.active,
            i.intercom_id,
            i.sip_address,
            i.username,
            i.password_encrypted,
            i.door_id
        FROM device d
        JOIN intercom i
            ON i.device_id = d.device_id
        WHERE split_part(i.sip_address, ';', 1) = $1
        `,
        [sipAddress]
    );
    return result.rows[0];
}
async function findIntercomByDeviceId(deviceId) {
    const result = await pool.query(
        `
        SELECT
            d.device_id,
            d.name,
            d.ip_address,
            d.port,
            i.username,
            i.password_encrypted,
            i.door_id
        FROM device d
        JOIN intercom i
            ON i.device_id = d.device_id
        WHERE d.device_id = $1
        `,
        [deviceId]
    );
    return result.rows[0];
}
async function findDeviceById(deviceId) {
    const result = await pool.query(
        `
        SELECT *
        FROM device
        WHERE device_id = $1
        `,
        [deviceId]
    );
    return result.rows[0];
}
async function findDeviceByIdAndTenant(deviceId, tenantId) {
    const result = await pool.query(
        `
        SELECT d.*
        FROM device d
        JOIN zone z
            ON z.zone_id = d.zone_id
        JOIN condominium c
            ON c.condominium_id = z.condominium_id
        WHERE d.device_id = $1
          AND c.tenant_id = $2
        `,
        [deviceId, tenantId]
    );
    return result.rows[0];
}
// Create a device inside a zone
async function createDevice(zoneId, type, name, ipAddress, port, snapshotUrl, streamUrl, active = true) {
    const result = await pool.query(
        `
        INSERT INTO device (zone_id, type, name, ip_address, port, snapshot_url, stream_url, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        `,
        [zoneId, type, name, ipAddress, port, snapshotUrl, streamUrl, active]
    );
    return result.rows[0];
}
// Update core device fields
async function updateDevice(deviceId, zoneId, name, ipAddress, port, snapshotUrl, streamUrl, active) {
    const result = await pool.query(
        `
        UPDATE device
        SET
            zone_id = $2,
            name = $3,
            ip_address = $4,
            port = $5,
            snapshot_url = $6,
            stream_url = $7,
            active = $8
        WHERE device_id = $1
        RETURNING *
        `,
        [deviceId, zoneId, name, ipAddress, port, snapshotUrl, streamUrl, active]
    );
    return result.rows[0];
}
// Delete device — cascades to intercom automatically
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
// Move a device to a different zone
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
// Get all devices in a zone, with intercom fields joined
async function findDevicesByZone(zoneId) {
    const result = await pool.query(
        `
        SELECT
            d.*,
            z.name AS zone_name,
            i.intercom_id,
            i.sip_address,
            i.username AS sip_username,
            i.password_encrypted,
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
// Get all devices in a condominium (across all its zones), optionally filtered by a specific zone
async function findDevicesByCondominium(condominiumId, tenantId, zoneId = null) {
    if (zoneId) {
        const result = await pool.query(
            `
            SELECT
                d.*,
                z.name AS zone_name,
                i.intercom_id,
                i.sip_address,
                i.username AS sip_username,
                i.password_encrypted,
                i.door_id
            FROM device d
            JOIN zone z
                ON z.zone_id = d.zone_id
            JOIN condominium c
                ON c.condominium_id = z.condominium_id
            LEFT JOIN intercom i
                ON i.device_id = d.device_id
            WHERE z.condominium_id = $1
            AND c.tenant_id = $2
            AND d.zone_id = $3
            ORDER BY d.type, d.name
            `,
            [condominiumId, tenantId, zoneId]
        );
        return result.rows;
    }
    const result = await pool.query(
        `
        SELECT
            d.*,
            z.name AS zone_name,
            i.intercom_id,
            i.sip_address,
            i.username AS sip_username,
            i.password_encrypted,
            i.door_id
        FROM device d
        JOIN zone z
            ON z.zone_id = d.zone_id
        JOIN condominium c
            ON c.condominium_id = z.condominium_id
        LEFT JOIN intercom i
            ON i.device_id = d.device_id
        WHERE z.condominium_id = $1
        AND c.tenant_id = $2
        ORDER BY z.name, d.type, d.name
        `,
        [condominiumId, tenantId]
    );
    return result.rows;
}


module.exports = {
    findIntercoms, findCameras, findIntercomBySipAddress, findIntercomByDeviceId, findDeviceById, findDeviceByIdAndTenant,
    createDevice, updateDevice, deleteDevice,
    moveDeviceToZone, findDevicesByZone, findDevicesByCondominium,
};