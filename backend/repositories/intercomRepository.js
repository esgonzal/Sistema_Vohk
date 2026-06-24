const pool = require('../database/db');

async function findIntercomById(intercomId) {
    const result = await pool.query(
        `SELECT * FROM intercom WHERE intercom_id = $1`,
        [intercomId]
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
            i.intercom_id,
            i.sip_address,
            i.username,
            i.password_encrypted,
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
        FROM intercom i
        JOIN device d ON d.device_id = i.device_id
        WHERE split_part(i.sip_address, ';', 1) = $1
        `,
        [sipAddress]
    );
    return result.rows[0];
}
async function createIntercom(deviceId, sipAddress, username, passwordEncrypted, doorId) {
    const result = await pool.query(
        `
        INSERT INTO intercom (device_id, sip_address, username, password_encrypted, door_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [deviceId, sipAddress, username, passwordEncrypted, doorId]
    );
    return result.rows[0];
}
async function updateIntercom(deviceId, sipAddress, username, passwordEncrypted, doorId) {
    const result = await pool.query(
        `
        UPDATE intercom
        SET sip_address = $2, username = $3, password_encrypted = $4, door_id = $5
        WHERE device_id = $1
        RETURNING *
        `,
        [deviceId, sipAddress, username, passwordEncrypted, doorId]
    );
    return result.rows[0];
}
async function deleteIntercom(deviceId) {
    const result = await pool.query(
        `DELETE FROM intercom WHERE device_id = $1 RETURNING *`,
        [deviceId]
    );
    return result.rows[0];
}

module.exports = { findIntercomById, findIntercomByDeviceId, findIntercomBySipAddress, createIntercom, updateIntercom, deleteIntercom, };