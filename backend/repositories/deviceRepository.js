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
            d.condominium_id,
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
async function findByDeviceId(deviceId) {
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

module.exports = { findIntercoms, findCameras, findIntercomBySipAddress, findIntercomByDeviceId, findByDeviceId };