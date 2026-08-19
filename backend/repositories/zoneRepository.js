const pool = require('../database/db');

async function findById(zoneId) {
    const result = await pool.query(`
        SELECT zone_id, condominium_id, name, created_at 
        FROM zone 
        WHERE zone_id = $1
        `, [zoneId]);
    return result.rows[0];
}

async function createZone(condominiumId, adminUserId, name) {
    const result = await pool.query(`
        INSERT INTO zone (condominium_id, name) 
        SELECT condominium_id, $3 
        FROM condominium 
        WHERE condominium_id = $1 AND ($2::uuid IS NULL OR admin_user_id = $2) 
        RETURNING *
        `, [condominiumId, adminUserId, name]);
    return result.rows[0];
}

async function updateZone(zoneId, adminUserId, name) {
    const result = await pool.query(`
        UPDATE zone z 
        SET name = $3 
        FROM condominium c 
        WHERE z.zone_id = $1 AND z.condominium_id = c.condominium_id AND ($2::uuid IS NULL OR c.admin_user_id = $2) 
        RETURNING z.*
        `, [zoneId, adminUserId, name]);
    return result.rows[0];
}

async function deleteZone(zoneId, adminUserId) {
    const result = await pool.query(`
        DELETE 
        FROM zone z USING condominium c 
        WHERE z.zone_id = $1 AND z.condominium_id = c.condominium_id AND ($2::uuid IS NULL OR c.admin_user_id = $2) 
        RETURNING z.*
        `, [zoneId, adminUserId]);
    return result.rows[0];
}

async function countDevicesByZone(zoneId, adminUserId) {
    const result = await pool.query(`
        SELECT COUNT(*)::int AS count 
        FROM device d 
        JOIN zone z ON z.zone_id = d.zone_id 
        JOIN condominium c ON c.condominium_id = z.condominium_id 
        WHERE d.zone_id = $1 AND ($2::uuid IS NULL OR c.admin_user_id = $2)
        `, [zoneId, adminUserId]);
    return result.rows[0].count;
}

module.exports = { findById, createZone, updateZone, deleteZone, countDevicesByZone };