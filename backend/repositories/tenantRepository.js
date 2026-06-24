const pool = require('../database/db');

async function findTenantById(tenantId) {
    const result = await pool.query(
        `SELECT * FROM tenant WHERE tenant_id = $1`,
        [tenantId]
    );
    return result.rows[0];
}
async function findTenants() {
    const result = await pool.query(
        `SELECT * FROM tenant ORDER BY name`
    );
    return result.rows;
}
async function createTenant(name, rut) {
    const result = await pool.query(
        `
        INSERT INTO tenant (name, rut)
        VALUES ($1, $2)
        RETURNING *
        `,
        [name, rut]
    );
    return result.rows[0];
}
async function updateTenant(tenantId, name, rut, status) {
    const result = await pool.query(
        `
        UPDATE tenant
        SET name = $2, rut = $3, status = $4
        WHERE tenant_id = $1
        RETURNING *
        `,
        [tenantId, name, rut, status]
    );
    return result.rows[0];
}
async function deleteTenant(tenantId) {
    const result = await pool.query(
        `DELETE FROM tenant WHERE tenant_id = $1 RETURNING *`,
        [tenantId]
    );
    return result.rows[0];
}

module.exports = { findTenantById, findTenants, createTenant, updateTenant, deleteTenant };