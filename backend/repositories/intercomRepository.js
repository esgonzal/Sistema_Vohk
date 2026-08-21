const pool = require('../database/db');

async function findIntercomByDeviceId(deviceId) {
    const result = await pool.query(
        `
        SELECT
            d.device_id,
            d.name,
            d.ip_address,
            d.port,
            i.intercom_id,
            i.sip_address,
            d.username,
            d.password_encrypted,
            i.door_id
        FROM intercom i
        JOIN device d ON d.device_id = i.device_id
        WHERE i.device_id = $1
        `,
        [deviceId]
    );
    return result.rows[0];
}
async function findIntercomBySipAddress(sipAddress) {
    const result = await pool.query(
        `
        SELECT
            d.device_id,
            d.zone_id,
            d.type,
            d.name AS intercom_name,
            d.ip_address,
            d.port,
            d.snapshot_url,
            d.stream_url,
            d.active,
            i.intercom_id,
            i.sip_address,
            i.door_id,
            d.username,
            d.password_encrypted,
            z.name AS zone_name,
            z.condominium_id,
            c.name AS condominium_name
        FROM intercom i
        JOIN device d ON d.device_id = i.device_id
        JOIN zone z ON z.zone_id = d.zone_id
        JOIN condominium c ON c.condominium_id = z.condominium_id
        WHERE split_part(i.sip_address, ';', 1) = $1
        `,
        [sipAddress]
    );
    return result.rows[0];
}
async function createIntercom(deviceId, sipAddress, doorId) {
    const result = await pool.query(
        `
        INSERT INTO intercom (device_id, sip_address, door_id)
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [deviceId, sipAddress, doorId]
    );
    return result.rows[0];
}
async function updateIntercom(deviceId, sipAddress, doorId) {
    const result = await pool.query(
        `
        UPDATE intercom
        SET
            sip_address = $2,
            door_id = $3
        WHERE device_id = $1
        RETURNING *
        `,
        [deviceId, sipAddress, doorId]
    );
    return result.rows[0];
}

module.exports = { findIntercomByDeviceId, findIntercomBySipAddress, createIntercom, updateIntercom, };