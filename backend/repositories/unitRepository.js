const pool = require('../database/db');

async function findUnitById(unitId) {
    const result = await pool.query(
        `SELECT * FROM unit WHERE unit_id = $1`,
        [unitId]
    );
    return result.rows[0];
}
async function findUnitByIdAndTenant(unitId, tenantId) {
    const result = await pool.query(
        `
        SELECT u.*
        FROM unit u
        JOIN building b
            ON b.building_id = u.building_id
        JOIN condominium c
            ON c.condominium_id = b.condominium_id
        WHERE u.unit_id = $1
          AND c.tenant_id = $2
        `,
        [unitId, tenantId]
    );
    return result.rows[0];
}
async function findUnitByIdAndAdmin(unitId, adminUserId) {
    const result = await pool.query(
        `
        SELECT
            u.*,
            b.name AS building_name,
            c.condominium_id
        FROM unit u
        INNER JOIN building b
            ON b.building_id = u.building_id
        INNER JOIN condominium c
            ON c.condominium_id = b.condominium_id
        WHERE u.unit_id = $1
          AND c.admin_user_id = $2
        `,
        [unitId, adminUserId]
    );
    return result.rows[0];
}
async function findUnitsByBuilding(buildingId, tenantId) {
    const result = await pool.query(
        `
        SELECT u.*
        FROM unit u
        JOIN building b
            ON b.building_id = u.building_id
        JOIN condominium c
            ON c.condominium_id = b.condominium_id
        WHERE u.building_id = $1
          AND c.tenant_id = $2
        ORDER BY u.floor, u.room_no
        `,
        [buildingId, tenantId]
    );
    return result.rows;
}
async function findUnitHierarchy(unitId) {
    const result = await pool.query(
        `
        SELECT
            u.unit_id,
            u.name,
            u.room_no,
            u.floor,

            b.building_id,
            b.name AS building_name,

            c.condominium_id,
            c.name AS condominium_name

        FROM unit u
        JOIN building b ON b.building_id = u.building_id
        JOIN condominium c ON c.condominium_id = b.condominium_id
        WHERE u.unit_id = $1
        `,
        [unitId]
    );
    return result.rows[0];
}
async function findUnitsByUser(userId) {
    const result = await pool.query(
        `
        SELECT
            u.*,
            ru.is_primary,
            b.name AS building_name,
            c.name AS condominium_name

        FROM resident_unit ru
        JOIN unit u ON u.unit_id = ru.unit_id
        JOIN building b ON b.building_id = u.building_id
        JOIN condominium c ON c.condominium_id = b.condominium_id
        WHERE ru.user_id = $1
        ORDER BY ru.is_primary DESC
        `,
        [userId]
    );
    return result.rows;
}
async function findResidentUnits(userId) {
    const result = await pool.query(
        `
        SELECT
            ru.is_primary,
            u.unit_id,
            u.name AS unit_name,
            u.room_no,
            u.floor,
            b.building_id,
            b.name AS building_name,
            c.condominium_id,
            c.name AS condominium_name
        FROM resident_unit ru
        JOIN unit u
            ON u.unit_id = ru.unit_id
        JOIN building b
            ON b.building_id = u.building_id
        JOIN condominium c
            ON c.condominium_id = b.condominium_id
        WHERE ru.user_id = $1
        ORDER BY
            ru.is_primary DESC,
            c.name,
            b.name,
            u.room_no
        `,
        [userId]
    );
    return result.rows;
}
async function createUnit(buildingId, tenantId, name, roomNo, floor) {
    const result = await pool.query(
        `
        INSERT INTO unit (building_id, name, room_no, floor)
        SELECT building_id, $3, $4, $5
        FROM building b
        JOIN condominium c
            ON c.condominium_id = b.condominium_id
        WHERE b.building_id = $1
          AND c.tenant_id = $2
        RETURNING *
        `,
        [buildingId, tenantId, name, roomNo, floor]
    );
    return result.rows[0];
}
async function updateUnit(unitId, tenantId, name, roomNo, floor) {
    const result = await pool.query(
        `
        UPDATE unit u
        SET
            name = $3,
            room_no = $4,
            floor = $5
        FROM building b, condominium c
        WHERE u.unit_id = $1
          AND b.building_id = u.building_id
          AND c.condominium_id = b.condominium_id
          AND c.tenant_id = $2
        RETURNING u.*
        `,
        [unitId, tenantId, name, roomNo, floor]
    );
    return result.rows[0];
}
async function deleteUnit(unitId, tenantId) {
    const result = await pool.query(
        `
        DELETE FROM unit u
        USING building b, condominium c
        WHERE u.unit_id = $1
          AND b.building_id = u.building_id
          AND c.condominium_id = b.condominium_id
          AND c.tenant_id = $2
        RETURNING u.*
        `,
        [unitId, tenantId]
    );
    return result.rows[0];
}
async function findBuildingsAndUnitsByCondominium(condominiumId) {
    const result = await pool.query(
        `
        SELECT
            b.building_id,
            b.name AS building_name,
            b.floor_count,

            u.unit_id,
            u.name AS unit_name,
            u.room_no AS unit_room_no,
            u.floor AS unit_floor

        FROM building b
        LEFT JOIN unit u ON u.building_id = b.building_id
        WHERE b.condominium_id = $1
        ORDER BY b.name, u.floor, u.room_no
        `,
        [condominiumId]
    );
    return result.rows;
}
async function countResidentsByUnit(unitId, tenantId) {
    const result = await pool.query(
        `
        SELECT COUNT(*)::int AS count
        FROM resident_unit ru
        JOIN unit u
            ON u.unit_id = ru.unit_id
        JOIN building b
            ON b.building_id = u.building_id
        JOIN condominium c
            ON c.condominium_id = b.condominium_id
        WHERE ru.unit_id = $1
          AND c.tenant_id = $2
        `,
        [unitId, tenantId]
    );
    return result.rows[0].count;
}

module.exports = {
    findUnitById, findUnitByIdAndTenant,findUnitByIdAndAdmin, findUnitsByBuilding, findUnitHierarchy, findUnitsByUser, findResidentUnits,
    createUnit, updateUnit, deleteUnit, findBuildingsAndUnitsByCondominium, countResidentsByUnit
};