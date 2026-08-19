const pool = require('../database/db');

async function findUnitByIdAndAdmin(unitId, adminUserId) {
    const result = await pool.query(`
        SELECT u.*, b.name AS building_name, c.condominium_id
        FROM unit u
        INNER JOIN building b ON b.building_id = u.building_id
        INNER JOIN condominium c ON c.condominium_id = b.condominium_id
        WHERE u.unit_id = $1 AND c.admin_user_id = $2
    `, [unitId, adminUserId]);
    return result.rows[0];
}

async function findUnitHierarchy(unitId) {
    const result = await pool.query(`
        SELECT u.unit_id, u.name, u.room_no, u.floor, b.building_id, b.name AS building_name, c.condominium_id, c.name AS condominium_name
        FROM unit u
        JOIN building b ON b.building_id = u.building_id
        JOIN condominium c ON c.condominium_id = b.condominium_id
        WHERE u.unit_id = $1
    `, [unitId]);
    return result.rows[0];
}

async function findUnitsByUser(userId) {
    const result = await pool.query(`
        SELECT u.*, ru.is_primary, b.name AS building_name, c.condominium_id, c.name AS condominium_name
        FROM resident_unit ru
        JOIN unit u ON u.unit_id = ru.unit_id
        JOIN building b ON b.building_id = u.building_id
        JOIN condominium c ON c.condominium_id = b.condominium_id
        WHERE ru.user_id = $1
        ORDER BY ru.is_primary DESC
    `, [userId]);
    return result.rows;
}

async function findResidentUnits(userId) {
    const result = await pool.query(`
        SELECT ru.is_primary, u.unit_id, u.name AS unit_name, u.room_no, u.floor, b.building_id, b.name AS building_name, c.condominium_id, c.name AS condominium_name, c.resident_camera_access
        FROM resident_unit ru
        JOIN unit u ON u.unit_id = ru.unit_id
        JOIN building b ON b.building_id = u.building_id
        JOIN condominium c ON c.condominium_id = b.condominium_id
        WHERE ru.user_id = $1
        ORDER BY ru.is_primary DESC, c.name, b.name, u.room_no
    `, [userId]);
    return result.rows;
}

async function createUnit(buildingId, name, roomNo, floor) {
    const result = await pool.query(`
        INSERT INTO unit (building_id, name, room_no, floor) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
        `, [buildingId, name, roomNo, floor]);
    return result.rows[0];
}

async function updateUnit(unitId, name, roomNo, floor) {
    const result = await pool.query(`
        UPDATE unit 
        SET name = $2, room_no = $3, floor = $4 
        WHERE unit_id = $1 RETURNING *
        `, [unitId, name, roomNo, floor]);
    return result.rows[0];
}

async function deleteUnit(unitId) {
    const result = await pool.query(`
        DELETE 
        FROM unit 
        WHERE unit_id = $1 
        RETURNING *
        `, [unitId]);
    return result.rows[0];
}

async function countResidentsByUnit(unitId) {
    const result = await pool.query(`
        SELECT COUNT(*)::int AS count 
        FROM resident_unit 
        WHERE unit_id = $1
        `, [unitId]);
    return result.rows[0].count;
}

module.exports = { findUnitByIdAndAdmin, findUnitHierarchy, findUnitsByUser, findResidentUnits, createUnit, updateUnit, deleteUnit, countResidentsByUnit };