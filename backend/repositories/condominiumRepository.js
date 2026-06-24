const pool = require('../database/db');

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

module.exports = {
    findCondominiumById, findCondominiums, findCondominiumsByTenant, createCondominium, updateCondominium, deleteCondominium, getCondominiumByUnitId
};