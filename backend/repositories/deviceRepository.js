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
// Create a device inside a zone. If type is 'intercom', also inserts into the intercom table.
async function createDevice(deviceData, intercomData = null) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const deviceResult = await client.query(
            `
            INSERT INTO device (zone_id, type, name, ip_address, port, snapshot_url, stream_url, active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            `,
            [
                deviceData.zoneId, deviceData.type, deviceData.name, deviceData.ipAddress,
                deviceData.port, deviceData.snapshotUrl, deviceData.streamUrl, deviceData.active ?? true
            ]
        );
        const device = deviceResult.rows[0];
        if (deviceData.type === 'intercom' && intercomData) {
            await client.query(
                `
                INSERT INTO intercom (device_id, sip_address, username, password_encrypted, door_id)
                VALUES ($1, $2, $3, $4, $5)
                `,
                [device.device_id, intercomData.sipAddress, intercomData.username, intercomData.passwordEncrypted, intercomData.doorId]
            );
        }
        await client.query('COMMIT');
        return device;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
// Update core device fields
async function updateDevice(deviceId, name, ipAddress, port, snapshotUrl, streamUrl, active) {
    const result = await pool.query(
        `
        UPDATE device
        SET
            name = $2,
            ip_address = $3,
            port = $4,
            snapshot_url = $5,
            stream_url = $6,
            active = $7
        WHERE device_id = $1
        RETURNING *
        `,
        [deviceId, name, ipAddress, port, snapshotUrl, streamUrl, active]
    );
    return result.rows[0];
}
// Update intercom-specific fields
async function updateIntercom(deviceId, sipAddress, username, passwordEncrypted, doorId) {
    const result = await pool.query(
        `
        UPDATE intercom
        SET
            sip_address = $2,
            username = $3,
            password_encrypted = $4,
            door_id = $5
        WHERE device_id = $1
        RETURNING *
        `,
        [deviceId, sipAddress, username, passwordEncrypted, doorId]
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
async function findDevicesByCondominium(condominiumId, zoneId = null) {
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
            LEFT JOIN intercom i
                ON i.device_id = d.device_id
            WHERE z.condominium_id = $1
              AND d.zone_id = $2
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
        WHERE z.condominium_id = $1
        ORDER BY z.name, d.type, d.name
        `,
        [condominiumId]
    );
    return result.rows;
}

module.exports = {
    findIntercoms, findCameras, findIntercomBySipAddress, findIntercomByDeviceId, findDeviceById,
    createDevice, updateDevice, updateIntercom, deleteDevice,
    moveDeviceToZone, findDevicesByZone, findDevicesByCondominium,
};