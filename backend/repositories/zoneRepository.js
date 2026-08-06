const pool = require('../database/db');

async function createZone(condominiumId, userId, name) {
    const result = await pool.query(
        `
        INSERT INTO zone (condominium_id, name)
        SELECT condominium_id, $3
        FROM condominium
        WHERE condominium_id = $1 AND admin_user_id = $2
        RETURNING *;
        `,
        [condominiumId, userId, name]
    );
    return result.rows[0];
}
async function updateZone(zoneId, userId, name) {
    const result = await pool.query(
        `
        UPDATE zone z
        SET name = $3
        FROM condominium c
        WHERE z.zone_id = $1 AND z.condominium_id = c.condominium_id AND c.admin_user_id = $2
        RETURNING z.*;
        `,
        [zoneId, userId, name]
    );
    return result.rows[0];
}
async function deleteZone(zoneId, userId) {
    const result = await pool.query(
        `
        DELETE FROM zone z
        USING condominium c
        WHERE z.zone_id = $1 AND z.condominium_id = c.condominium_id AND c.admin_user_id = $2
        RETURNING z.*;
        `,
        [zoneId, userId]
    );
    return result.rows[0];
}
async function countDevicesByZone(zoneId, userId) {
    const result = await pool.query(
        `
        SELECT COUNT(*)::int AS count
        FROM device d
        JOIN zone z ON z.zone_id = d.zone_id
        JOIN condominium c ON c.condominium_id = z.condominium_id
        WHERE d.zone_id = $1 AND c.admin_user_id = $2
        `,
        [zoneId, userId]
    );
    return result.rows[0].count;
}

module.exports = { createZone, updateZone, deleteZone, countDevicesByZone };