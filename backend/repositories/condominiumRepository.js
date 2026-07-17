const pool = require('../database/db');

async function findCondominiumById(condominiumId) {
    const result = await pool.query(
        `SELECT * FROM condominium WHERE condominium_id = $1`,
        [condominiumId]
    );
    return result.rows[0];
}
async function findByIdAndAdmin(condominiumId, adminUserId) {
    const result = await pool.query(
        `
        SELECT condominium_id
        FROM condominium
        WHERE condominium_id = $1
        AND admin_user_id = $2
        `,
        [condominiumId, adminUserId]
    );
    return result.rows[0];
}
async function findCondominiums(adminUserId) {
    const result = await pool.query(
        `
        SELECT *
        FROM condominium
        WHERE admin_user_id = $1
        ORDER BY name
        `,
        [adminUserId]
    );
    return result.rows;
}
async function findCondominiumsByTenant(tenantId) {
    const result = await pool.query(
        `SELECT * FROM condominium WHERE tenant_id = $1 ORDER BY name`,
        [tenantId]
    );
    return result.rows;
}
async function createCondominium(userId, name, address, city) {
    const result = await pool.query(
        `
        INSERT INTO condominium (admin_user_id, name, address, city)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [userId, name, address, city]
    );
    return result.rows[0];
}
async function updateCondominium(condominiumId, name, address, city) {
    const result = await pool.query(
        `
        UPDATE condominium
        SET name = $2,
            address = $3,
            city = $4
        WHERE condominium_id = $1
        RETURNING *;
        `,
        [condominiumId, name, address, city]
    );
    return result.rows[0];
}
async function deleteCondominium(condominiumId, userId) {
    const result = await pool.query(
        `
        DELETE FROM condominium
        WHERE condominium_id = $1
          AND admin_user_id = $2
        RETURNING *;
        `,
        [condominiumId, userId]
    );
    return result.rows[0];
}
async function getCondominiumByUnitId(unitId) {
    const result = await pool.query(
        `
        SELECT b.condominium_id
        FROM unit u
        JOIN building b ON u.building_id = b.building_id
        WHERE u.unit_id = $1
        `,
        [unitId]
    );
    return result.rows[0]?.condominium_id;
}
async function countBuildingsByCondominium(condominiumId) {
    const result = await pool.query(
        `
        SELECT COUNT(*)::int AS count
        FROM building b
        JOIN condominium c
            ON c.condominium_id = b.condominium_id
        WHERE b.condominium_id = $1
        `,
        [condominiumId]
    );
    return result.rows[0].count;
}
async function findFirstAccessibleByUser(userId, tenantId) {
    const result = await pool.query(
        `
        SELECT *
        FROM (
            -- Administrator
            SELECT c.*
            FROM condominium c
            WHERE c.admin_user_id = $1
              AND c.tenant_id = $2
            UNION
            -- Resident
            SELECT c.*
            FROM resident_unit ru
            JOIN unit u
                ON u.unit_id = ru.unit_id
            JOIN building b
                ON b.building_id = u.building_id
            JOIN condominium c
                ON c.condominium_id = b.condominium_id
            WHERE ru.user_id = $1
              AND c.tenant_id = $2
        ) accessible
        ORDER BY created_at
        LIMIT 1
        `,
        [userId, tenantId]
    );
    return result.rows[0] ?? null;
}
async function findCondominiumTreeRows(adminUserId) {
    const result = await pool.query(
        `
        SELECT
            c.condominium_id,
            c.name AS condominium_name,
            c.address,
            c.city,
            b.building_id,
            b.name AS building_name,
            b.floor_count,
            z.zone_id,
            z.name AS zone_name,
            z.created_at AS zone_created_at
        FROM condominium c
        LEFT JOIN building b ON b.condominium_id = c.condominium_id
        LEFT JOIN zone z ON z.condominium_id = c.condominium_id
        WHERE c.admin_user_id = $1
        ORDER BY
            c.name,
            b.name,
            z.name
        `,
        [adminUserId]
    );
    return result.rows;
}
async function findUnitTreeRows(condominiumId) {
    const result = await pool.query(
        `
        SELECT
            c.condominium_id,
            c.name AS condominium_name,
            c.address,
            c.city,
            b.building_id,
            b.name AS building_name,
            b.floor_count,
            u.unit_id,
            u.room_no,
            u.floor,
            au.user_id,
            au.legal_name,
            au.email,
            au.sip_identity,
            au.role,
            au.active,
            ru.is_primary
        FROM condominium c
        LEFT JOIN building b  ON b.condominium_id = c.condominium_id
        LEFT JOIN unit u  ON u.building_id = b.building_id
        LEFT JOIN resident_unit ru  ON ru.unit_id = u.unit_id
        LEFT JOIN app_user au  ON au.user_id = ru.user_id
        WHERE c.condominium_id = $1
        ORDER BY
            b.name,
            u.floor,
            u.room_no,
            ru.is_primary DESC,
            au.legal_name
        `,
        [condominiumId]
    );
    return result.rows;
}

module.exports = {
    findCondominiumById, findByIdAndAdmin, findCondominiums, findCondominiumsByTenant, findFirstAccessibleByUser,
    createCondominium, updateCondominium, deleteCondominium, getCondominiumByUnitId, countBuildingsByCondominium,
    findCondominiumTreeRows, findUnitTreeRows
};