const pool = require('../database/db');

async function findByUserAndUnit(userId, unitId) {
    const result = await pool.query(`
        SELECT * 
        FROM resident_unit 
        WHERE user_id = $1 AND unit_id = $2
    `, [userId, unitId]);
    return result.rows[0];
}

async function findByUserAndCondominium(userId, condominiumId) {
    const result = await pool.query(`
        SELECT ru.user_id
        FROM resident_unit ru
        INNER JOIN unit u ON u.unit_id = ru.unit_id
        INNER JOIN building b ON b.building_id = u.building_id
        WHERE ru.user_id = $1 AND b.condominium_id = $2
        LIMIT 1
    `, [userId, condominiumId]);
    return result.rows[0];
}

async function findUnitsByUser(userId) {
    const result = await pool.query(`
        SELECT ru.*, u.name AS unit_name, u.room_no, u.floor, b.name AS building_name, c.name AS condominium_name, c.condominium_id
        FROM resident_unit ru
        JOIN unit u ON u.unit_id = ru.unit_id
        JOIN building b ON b.building_id = u.building_id
        JOIN condominium c ON c.condominium_id = b.condominium_id
        WHERE ru.user_id = $1
        ORDER BY ru.is_primary DESC, u.name
    `, [userId]);
    return result.rows;
}

async function assignResident(userId, unitId, isPrimary = false) {
    const result = await pool.query(`
        INSERT INTO resident_unit (user_id, unit_id, is_primary) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (user_id, unit_id) DO NOTHING 
        RETURNING *
    `, [userId, unitId, isPrimary]);
    return result.rows[0];
}

async function unassignResident(userId, unitId) {
    const result = await pool.query(`
        DELETE 
        FROM resident_unit 
        WHERE user_id = $1 AND unit_id = $2 
        RETURNING *
    `, [userId, unitId]);
    return result.rows[0];
}

async function updateResidentUnit(userId, unitId, isPrimary) {
    const result = await pool.query(`
        UPDATE resident_unit 
        SET is_primary = $3 
        WHERE user_id = $1 AND unit_id = $2 
        RETURNING *
    `, [userId, unitId, isPrimary]);
    return result.rows[0];
}

async function findSipIdentitiesByUnit(unitId) {
    const result = await pool.query(`
        SELECT u.sip_identity
        FROM resident_unit ru
        INNER JOIN app_user u ON u.user_id = ru.user_id
        WHERE ru.unit_id = $1 AND u.sip_identity IS NOT NULL
        ORDER BY ru.is_primary DESC, u.legal_name
    `, [unitId]);
    return result.rows.map(row => row.sip_identity);
}

module.exports = { findByUserAndUnit, findByUserAndCondominium, findUnitsByUser, assignResident, unassignResident, updateResidentUnit, findSipIdentitiesByUnit };