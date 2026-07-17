const pool = require('../database/db');

async function findZonesByCondominium(condominiumId) {
    const result = await pool.query(
        `SELECT z.*
        FROM zone z
        INNER JOIN condominium c
            ON c.condominium_id = z.condominium_id
        WHERE z.condominium_id = $1
        ORDER BY z.name
        `,
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
async function findZoneByIdAndTenant(zoneId, tenantId) {
    const result = await pool.query(
        `
        SELECT z.*
        FROM zone z
        JOIN condominium c
            ON c.condominium_id = z.condominium_id
        WHERE z.zone_id = $1
          AND c.tenant_id = $2
        `,
        [zoneId, tenantId]
    );
    return result.rows[0];
}
async function createZone(condominiumId, name) {
    const result = await pool.query(
        `
        INSERT INTO zone (condominium_id, name)
        SELECT condominium_id, $2
        FROM condominium
        WHERE condominium_id = $1
        RETURNING *;
        `,
        [condominiumId, name]
    );
    return result.rows[0];
}
async function updateZone(zoneId, name) {
    const result = await pool.query(
        `
        UPDATE zone z
        SET name = $2
        FROM condominium c
        WHERE z.zone_id = $1
          AND z.condominium_id = c.condominium_id
        RETURNING z.*;
        `,
        [zoneId, name]
    );
    return result.rows[0];
}
async function deleteZone(zoneId) {
    const result = await pool.query(
        `
        DELETE FROM zone z
        USING condominium c
        WHERE z.zone_id = $1
          AND z.condominium_id = c.condominium_id
        RETURNING z.*;
        `,
        [zoneId]
    );
    return result.rows[0];
}
async function countDevicesByZone(zoneId) {
    const result = await pool.query(
        `
        SELECT COUNT(*)::int AS count
        FROM device d
        JOIN zone z
            ON z.zone_id = d.zone_id
        JOIN condominium c
            ON c.condominium_id = z.condominium_id
        WHERE d.zone_id = $1
        `,
        [zoneId]
    );
    return result.rows[0].count;
}

module.exports = { findZonesByCondominium, findZoneById, findZoneByIdAndTenant, createZone, updateZone, deleteZone, countDevicesByZone };