const pool = require('../database/db');

async function findById(condominiumId) {
    const result = await pool.query(`
        SELECT * 
        FROM condominium 
        WHERE condominium_id = $1
        `, [condominiumId]);
    return result.rows[0];
}

async function findByIdAndAdmin(condominiumId, adminUserId) {
    const result = await pool.query(`
        SELECT * 
        FROM condominium 
        WHERE condominium_id = $1 AND admin_user_id = $2
        `, [condominiumId, adminUserId]);
    return result.rows[0];
}

async function findByAdminUserId(adminUserId = null) {
    const result = await pool.query(`
        SELECT condominium_id, admin_user_id, name, address, city, resident_camera_access, created_at 
        FROM condominium WHERE ($1::uuid IS NULL OR admin_user_id = $1) 
        ORDER BY name
        `, [adminUserId]);
    return result.rows;
}

async function createCondominium(userId, name, address, city) {
    const result = await pool.query(`
        INSERT INTO condominium (admin_user_id, name, address, city) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
        `, [userId, name, address, city]);
    return result.rows[0];
}

async function updateCondominium(condominiumId, adminUserId, name, address, city) {
    const result = await pool.query(`
        UPDATE condominium SET name = $3, address = $4, city = $5 
        WHERE condominium_id = $1 AND ($2::uuid IS NULL OR admin_user_id = $2) 
        RETURNING *
        `, [condominiumId, adminUserId, name, address, city]);
    return result.rows[0];
}

async function deleteCondominium(condominiumId, adminUserId) {
    const result = await pool.query(`
        DELETE 
        FROM condominium WHERE condominium_id = $1 AND ($2::uuid IS NULL OR admin_user_id = $2) 
        RETURNING *
        `, [condominiumId, adminUserId]);
    return result.rows[0];
}

async function countBuildingsByCondominium(condominiumId, adminUserId) {
    const result = await pool.query(`
        SELECT COUNT(*)::int AS count 
        FROM building b 
        JOIN condominium c ON c.condominium_id = b.condominium_id 
        WHERE b.condominium_id = $1 AND ($2::uuid IS NULL OR c.admin_user_id = $2)
        `, [condominiumId, adminUserId]);
    return result.rows[0].count;
}

async function updateResidentCameraAccess(condominiumId, adminUserId, enabled) {
    const result = await pool.query(`
        UPDATE condominium 
        SET resident_camera_access = $3 
        WHERE condominium_id = $1 AND ($2::uuid IS NULL OR admin_user_id = $2) 
        RETURNING *
        `, [condominiumId, adminUserId, enabled]);
    return result.rows[0];
}

async function findCondominiumTreeRows(adminUserId = null) {
    const result = await pool.query(`
        SELECT c.condominium_id, c.name AS condominium_name, c.address, c.city, c.resident_camera_access, b.building_id, b.name AS building_name, b.floor_count, z.zone_id, z.name AS zone_name, z.created_at AS zone_created_at
        FROM condominium c
        LEFT JOIN building b ON b.condominium_id = c.condominium_id
        LEFT JOIN zone z ON z.condominium_id = c.condominium_id
        WHERE ($1::uuid IS NULL OR c.admin_user_id = $1)
        ORDER BY c.name, b.name, z.name
    `, [adminUserId]);
    return result.rows;
}

async function findUnitTreeRows(condominiumId) {
    const result = await pool.query(`
        SELECT c.condominium_id, c.name AS condominium_name, c.address, c.city, c.resident_camera_access, b.building_id, b.name AS building_name, b.floor_count, u.unit_id, u.name, u.room_no, u.floor, au.user_id, au.legal_name, au.email, au.sip_identity, au.role, au.active, ru.is_primary
        FROM condominium c
        LEFT JOIN building b ON b.condominium_id = c.condominium_id
        LEFT JOIN unit u ON u.building_id = b.building_id
        LEFT JOIN resident_unit ru ON ru.unit_id = u.unit_id
        LEFT JOIN app_user au ON au.user_id = ru.user_id
        WHERE c.condominium_id = $1
        ORDER BY b.name, u.floor, u.room_no, ru.is_primary DESC, au.legal_name
    `, [condominiumId]);
    return result.rows;
}

module.exports = { findById, findByIdAndAdmin, findByAdminUserId, createCondominium, updateCondominium, deleteCondominium, countBuildingsByCondominium, updateResidentCameraAccess, findCondominiumTreeRows, findUnitTreeRows };