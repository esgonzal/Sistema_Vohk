const pool = require('../database/db');

async function findZonesByCondominium(condominiumId) {
    const result = await pool.query(
        `SELECT * FROM zone WHERE condominium_id = $1 ORDER BY name`,
        [condominiumId]
    );
    return result.rows;
}
async function findZoneById(zoneId) {
    const result = await pool.query(
        `SELECT * FROM zone WHERE zone_id = $1`,
        [zoneId]
    );
    return result.rows[0];
}
async function createZone(condominiumId, name) {
    const result = await pool.query(
        `
        INSERT INTO zone (condominium_id, name)
        VALUES ($1, $2)
        RETURNING *
        `,
        [condominiumId, name]
    );
    return result.rows[0];
}
async function updateZone(zoneId, name) {
    const result = await pool.query(
        `
        UPDATE zone
        SET name = $2
        WHERE zone_id = $1
        RETURNING *
        `,
        [zoneId, name]
    );
    return result.rows[0];
}
async function deleteZone(zoneId) {
    const result = await pool.query(
        `DELETE FROM zone WHERE zone_id = $1 RETURNING *`,
        [zoneId]
    );
    return result.rows[0];
}
async function countDevicesByZone(zoneId) {
    const result = await pool.query(
        `
        SELECT COUNT(*)::int AS count
        FROM device
        WHERE zone_id = $1
        `,
        [zoneId]
    );
    return result.rows[0].count;
}

module.exports = { findZonesByCondominium, findZoneById, createZone, updateZone, deleteZone, countDevicesByZone };