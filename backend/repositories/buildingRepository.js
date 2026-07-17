const pool = require('../database/db');

async function findBuildingById(buildingId) {
    const result = await pool.query(
        `SELECT * FROM building WHERE building_id = $1`,
        [buildingId]
    );
    return result.rows[0];
}
async function findBuildingsByCondominium(condominiumId) {
    const result = await pool.query(
        `
        SELECT b.*
        FROM building b
        INNER JOIN condominium c
            ON c.condominium_id = b.condominium_id
        WHERE b.condominium_id = $1
        ORDER BY b.name
        `,
        [condominiumId]
    );
    return result.rows;
}
async function createBuilding(condominiumId, userId, name, floorCount) {
    const result = await pool.query(
        `
        INSERT INTO building (condominium_id, name, floor_count)
        SELECT c.condominium_id, $3, $4
        FROM condominium c
        WHERE c.condominium_id = $1
          AND c.admin_user_id = $2
        RETURNING *;
        `,
        [condominiumId, userId, name, floorCount]
    );
    return result.rows[0];
}
async function updateBuilding(buildingId, name, floorCount) {
    const result = await pool.query(
        `
        UPDATE building b
        SET name = $2, floor_count = $3
        FROM condominium c
        WHERE b.building_id = $1
          AND b.condominium_id = c.condominium_id
        RETURNING b.*;
        `,
        [buildingId, name, floorCount]
    );
    return result.rows[0];
}
async function deleteBuilding(buildingId) {
    const result = await pool.query(
        `
        DELETE FROM building b
        USING condominium c
        WHERE b.building_id = $1
          AND b.condominium_id = c.condominium_id
        RETURNING b.*;
        `,
        [buildingId]
    );
    return result.rows[0];
}
async function countUnitsByBuilding(buildingId) {
    const result = await pool.query(
        `
        SELECT COUNT(*)::int AS count
        FROM unit u
        JOIN building b
            ON b.building_id = u.building_id
        JOIN condominium c
            ON c.condominium_id = b.condominium_id
        WHERE u.building_id = $1
        `,
        [buildingId]
    );
    return result.rows[0].count;
}

module.exports = { findBuildingById, findBuildingsByCondominium, createBuilding, updateBuilding, deleteBuilding, countUnitsByBuilding };