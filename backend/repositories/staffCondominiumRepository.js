const pool = require('../database/db');

async function findByUserAndCondominium(userId, condominiumId) {
    const result = await pool.query(`
        SELECT sc.*, c.name AS condominium_name
        FROM staff_condominium sc
        INNER JOIN condominium c ON c.condominium_id = sc.condominium_id
        WHERE sc.user_id = $1 AND sc.condominium_id = $2
    `, [userId, condominiumId]);
    return result.rows[0];
}

async function assignStaff(userId, condominiumId) {
    const result = await pool.query(`
        INSERT INTO staff_condominium (user_id, condominium_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, condominium_id) DO NOTHING
        RETURNING *
    `, [userId, condominiumId]);
    return result.rows[0];
}

async function findCondominiumsByStaff(userId) {
    const result = await pool.query(`
        SELECT c.*
        FROM staff_condominium sc
        INNER JOIN condominium c ON c.condominium_id = sc.condominium_id
        WHERE sc.user_id = $1
        ORDER BY c.name
    `, [userId]);
    return result.rows;
}

async function removeStaff(userId, condominiumId) {
    const result = await pool.query(`
        DELETE FROM staff_condominium
        WHERE user_id = $1 AND condominium_id = $2
        RETURNING *
    `, [userId, condominiumId]);
    return result.rows[0];
}

module.exports = { findByUserAndCondominium, assignStaff, findCondominiumsByStaff, removeStaff };