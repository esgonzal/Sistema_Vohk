const pool = require('../database/db');

async function findByIdAndAdmin(buildingId, adminUserId) {
    const result = await pool.query(`
        SELECT b.*, c.condominium_id 
        FROM building b 
        JOIN condominium c ON c.condominium_id = b.condominium_id 
        WHERE b.building_id = $1 AND c.admin_user_id = $2
        `, [buildingId, adminUserId]);
    return result.rows[0];
}

async function createBuilding(condominiumId, adminUserId, name, floorCount) {
    const result = await pool.query(`
        INSERT INTO building (condominium_id, name, floor_count) 
        SELECT c.condominium_id, $3, $4 
        FROM condominium c 
        WHERE c.condominium_id = $1 AND ($2::uuid IS NULL OR c.admin_user_id = $2) 
        RETURNING *
        `, [condominiumId, adminUserId, name, floorCount]);
    return result.rows[0];
}

async function updateBuilding(buildingId, adminUserId, name, floorCount) {
    const result = await pool.query(`
        UPDATE building b 
        SET name = $3, floor_count = $4 
        FROM condominium c 
        WHERE b.building_id = $1 AND b.condominium_id = c.condominium_id AND ($2::uuid IS NULL OR c.admin_user_id = $2) 
        RETURNING b.*
        `, [buildingId, adminUserId, name, floorCount]);
    return result.rows[0];
}

async function deleteBuilding(buildingId, adminUserId) {
    const result = await pool.query(`
        DELETE 
        FROM building b USING condominium c 
        WHERE b.building_id = $1 AND b.condominium_id = c.condominium_id AND ($2::uuid IS NULL OR c.admin_user_id = $2) 
        RETURNING b.*
        `, [buildingId, adminUserId]);
    return result.rows[0];
}

async function countUnitsByBuilding(buildingId, adminUserId) {
    const result = await pool.query(`
        SELECT COUNT(*)::int AS count 
        FROM unit u JOIN building b ON b.building_id = u.building_id 
        JOIN condominium c ON c.condominium_id = b.condominium_id 
        WHERE u.building_id = $1 AND ($2::uuid IS NULL OR c.admin_user_id = $2)
        `, [buildingId, adminUserId]);
    return result.rows[0].count;
}

module.exports = { findByIdAndAdmin, createBuilding, updateBuilding, deleteBuilding, countUnitsByBuilding };