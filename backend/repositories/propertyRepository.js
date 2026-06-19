const pool = require('../database/db');

// ── Condominiums ──────────────────────────────────────────────────────────────

async function findCondominiumById(condominiumId) {
    const result = await pool.query(
        `SELECT * FROM condominium WHERE condominium_id = $1`,
        [condominiumId]
    );
    return result.rows[0];
}
async function findCondominiums() {
    const result = await pool.query(`SELECT * FROM condominium ORDER BY name`);
    return result.rows;
}
async function findCondominiumsByTenant(tenantId) {
    const result = await pool.query(
        `SELECT * FROM condominium WHERE tenant_id = $1 ORDER BY name`,
        [tenantId]
    );
    return result.rows;
}
async function createCondominium(tenantId, name, address, city) {
    const result = await pool.query(
        `
        INSERT INTO condominium (tenant_id, name, address, city)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [tenantId, name, address, city]
    );
    return result.rows[0];
}
async function updateCondominium(condominiumId, name, address, city) {
    const result = await pool.query(
        `
        UPDATE condominium
        SET name = $2, address = $3, city = $4
        WHERE condominium_id = $1
        RETURNING *
        `,
        [condominiumId, name, address, city]
    );
    return result.rows[0];
}
async function deleteCondominium(condominiumId) {
    const result = await pool.query(
        `DELETE FROM condominium WHERE condominium_id = $1 RETURNING *`,
        [condominiumId]
    );
    return result.rows[0];
}

// ── Zones ─────────────────────────────────────────────────────────────────────

async function findZonesByCondominium(condominiumId) {
    const result = await pool.query(
        `SELECT * FROM zone WHERE condominium_id = $1 ORDER BY name`,
        [condominiumId]
    );
    return result.rows;
}
async function findZoneById(zoneId) {
    const result = await pool.query(
        `SELECT * FROM zone WHERE zone_id = $1`,
        [zoneId]
    );
    return result.rows[0];
}
async function createZone(condominiumId, name) {
    const result = await pool.query(
        `
        INSERT INTO zone (condominium_id, name)
        VALUES ($1, $2)
        RETURNING *
        `,
        [condominiumId, name]
    );
    return result.rows[0];
}
async function updateZone(zoneId, name) {
    const result = await pool.query(
        `
        UPDATE zone
        SET name = $2
        WHERE zone_id = $1
        RETURNING *
        `,
        [zoneId, name]
    );
    return result.rows[0];
}
async function deleteZone(zoneId) {
    const result = await pool.query(
        `DELETE FROM zone WHERE zone_id = $1 RETURNING *`,
        [zoneId]
    );
    return result.rows[0];
}

// ── Buildings ─────────────────────────────────────────────────────────────────

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

// ── Units ─────────────────────────────────────────────────────────────────────

async function findUnitById(unitId) {
    const result = await pool.query(
        `SELECT * FROM unit WHERE unit_id = $1`,
        [unitId]
    );
    return result.rows[0];
}
async function findUnitsByBuilding(buildingId) {
    const result = await pool.query(
        `
        SELECT * FROM unit
        WHERE building_id = $1
        ORDER BY floor, room_no
        `,
        [buildingId]
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
async function createUnit(buildingId, name, roomNo, floor) {
    const result = await pool.query(
        `
        INSERT INTO unit (building_id, name, room_no, floor)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [buildingId, name, roomNo, floor]
    );
    return result.rows[0];
}
async function updateUnit(unitId, name, roomNo, floor) {
    const result = await pool.query(
        `
        UPDATE unit
        SET name = $2, room_no = $3, floor = $4
        WHERE unit_id = $1
        RETURNING *
        `,
        [unitId, name, roomNo, floor]
    );
    return result.rows[0];
}
async function deleteUnit(unitId) {
    const result = await pool.query(
        `DELETE FROM unit WHERE unit_id = $1 RETURNING *`,
        [unitId]
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

module.exports = {
    // Condominiums
    findCondominiumById, findCondominiums, findCondominiumsByTenant,
    createCondominium, updateCondominium, deleteCondominium,
    // Zones
    findZonesByCondominium, findZoneById, createZone, updateZone, deleteZone,
    // Buildings
    findBuildingById, findBuildingsByCondominium, createBuilding, updateBuilding, deleteBuilding,
    // Units
    findUnitById, findUnitsByBuilding, findUnitHierarchy, findUnitsByUser,
    createUnit, updateUnit, deleteUnit, findBuildingsAndUnitsByCondominium,
};