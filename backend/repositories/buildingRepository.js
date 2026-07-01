const pool = require('../database/db');

async function findBuildingById(buildingId) {
    const result = await pool.query(
        `SELECT * FROM building WHERE building_id = $1`,
        [buildingId]
    );
    return result.rows[0];
}
async function findBuildingsByCondominium(condominiumId, tenantId) {
    const result = await pool.query(
        `
        SELECT b.*
        FROM building b
        INNER JOIN condominium c
            ON c.condominium_id = b.condominium_id
        WHERE b.condominium_id = $1
          AND c.tenant_id = $2
        ORDER BY b.name
        `,
        [condominiumId, tenantId]
    );
    return result.rows;
}
async function createBuilding(condominiumId, tenantId, name, floorCount) {
    const result = await pool.query(
        `
        INSERT INTO building (condominium_id, name, floor_count)
        SELECT c.condominium_id, $3, $4
        FROM condominium c
        WHERE c.condominium_id = $1
          AND c.tenant_id = $2
        RETURNING *;
        `,
        [condominiumId, tenantId, name, floorCount]
    );
    return result.rows[0];
}
async function updateBuilding(buildingId, tenantId, name, floorCount) {
    const result = await pool.query(
        `
        UPDATE building b
        SET name = $3,
            floor_count = $4
        FROM condominium c
        WHERE b.building_id = $1
          AND b.condominium_id = c.condominium_id
          AND c.tenant_id = $2
        RETURNING b.*;
        `,
        [buildingId, tenantId, name, floorCount]
    );
    return result.rows[0];
}
async function deleteBuilding(buildingId, tenantId) {
    const result = await pool.query(
        `
        DELETE FROM building b
        USING condominium c
        WHERE b.building_id = $1
          AND b.condominium_id = c.condominium_id
          AND c.tenant_id = $2
        RETURNING b.*;
        `,
        [buildingId, tenantId]
    );
    return result.rows[0];
}
async function countUnitsByBuilding(buildingId, tenantId) {
    const result = await pool.query(
        `
        SELECT COUNT(*)::int AS count
        FROM unit u
        JOIN building b
            ON b.building_id = u.building_id
        JOIN condominium c
            ON c.condominium_id = b.condominium_id
        WHERE u.building_id = $1
        AND c.tenant_id = $2
        `,
        [buildingId, tenantId]
    );
    return result.rows[0].count;
}

module.exports = { findBuildingById, findBuildingsByCondominium, createBuilding, updateBuilding, deleteBuilding, countUnitsByBuilding };