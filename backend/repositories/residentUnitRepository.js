const pool = require('../database/db');

async function findByUserAndUnit(userId, unitId) {
    const result = await pool.query(
        `
        SELECT * FROM resident_unit
        WHERE user_id = $1 AND unit_id = $2
        `,
        [userId, unitId]
    );
    return result.rows[0];
}
async function findUnitsByUser(userId) {
    const result = await pool.query(
        `
        SELECT
            ru.*,
            u.name AS unit_name,
            u.room_no,
            u.floor,
            b.name AS building_name,
            c.name AS condominium_name
        FROM resident_unit ru
        JOIN unit u ON u.unit_id = ru.unit_id
        JOIN building b ON b.building_id = u.building_id
        JOIN condominium c ON c.condominium_id = b.condominium_id
        WHERE ru.user_id = $1
        ORDER BY ru.is_primary DESC, u.name
        `,
        [userId]
    );
    return result.rows;
}
async function findUsersByUnit(unitId) {
    const result = await pool.query(
        `
        SELECT
            ru.*,
            au.username,
            au.identity,
            au.email,
            au.legal_name,
            au.role,
            au.active
        FROM resident_unit ru
        JOIN app_user au ON au.user_id = ru.user_id
        WHERE ru.unit_id = $1
        ORDER BY ru.is_primary DESC, au.legal_name
        `,
        [unitId]
    );
    return result.rows;
}
async function assignResident(userId, unitId, isPrimary = false) {
    const result = await pool.query(
        `
        INSERT INTO resident_unit (user_id, unit_id, is_primary)
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [userId, unitId, isPrimary]
    );
    return result.rows[0];
}
async function setPrimary(userId, unitId) {
    const result = await pool.query(
        `
        UPDATE resident_unit
        SET is_primary = TRUE
        WHERE user_id = $1 AND unit_id = $2
        RETURNING *
        `,
        [userId, unitId]
    );
    return result.rows[0];
}
async function unassignResident(userId, unitId) {
    const result = await pool.query(
        `
        DELETE FROM resident_unit
        WHERE user_id = $1 AND unit_id = $2
        RETURNING *
        `,
        [userId, unitId]
    );
    return result.rows[0];
}
async function unassignAllFromUnit(unitId) {
    const result = await pool.query(
        `DELETE FROM resident_unit WHERE unit_id = $1 RETURNING *`,
        [unitId]
    );
    return result.rows;
}
async function unassignAllFromUser(userId) {
    const result = await pool.query(
        `DELETE FROM resident_unit WHERE user_id = $1 RETURNING *`,
        [userId]
    );
    return result.rows;
}

module.exports = { findByUserAndUnit, findUnitsByUser, findUsersByUnit, assignResident, setPrimary, unassignResident, unassignAllFromUnit, unassignAllFromUser, };