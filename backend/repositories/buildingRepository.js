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
        `SELECT * FROM building WHERE condominium_id = $1 ORDER BY name`,
        [condominiumId]
    );
    return result.rows;
}
async function createBuilding(condominiumId, name, floorCount) {
    const result = await pool.query(
        `
        INSERT INTO building (condominium_id, name, floor_count)
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [condominiumId, name, floorCount]
    );
    return result.rows[0];
}
async function updateBuilding(buildingId, name, floorCount) {
    const result = await pool.query(
        `
        UPDATE building
        SET name = $2, floor_count = $3
        WHERE building_id = $1
        RETURNING *
        `,
        [buildingId, name, floorCount]
    );
    return result.rows[0];
}
async function deleteBuilding(buildingId) {
    const result = await pool.query(
        `DELETE FROM building WHERE building_id = $1 RETURNING *`,
        [buildingId]
    );
    return result.rows[0];
}
async function countUnitsByBuilding(buildingId) {
    const result = await pool.query(
        `
        SELECT COUNT(*)::int AS count
        FROM unit
        WHERE building_id = $1
        `,
        [buildingId]
    );
    return result.rows[0].count;
}

module.exports = { findBuildingById, findBuildingsByCondominium, createBuilding, updateBuilding, deleteBuilding, countUnitsByBuilding };