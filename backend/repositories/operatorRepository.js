const pool = require('../database/db');

async function findOperatorById(operatorCompanyId) {
    const result = await pool.query(
        `SELECT * FROM operator_company WHERE operator_company_id = $1`,
        [operatorCompanyId]
    );
    return result.rows[0];
}
async function findOperators() {
    const result = await pool.query(
        `SELECT * FROM operator_company ORDER BY name`
    );
    return result.rows;
}
async function createOperator(name, rut, contactInfo) {
    const result = await pool.query(
        `
        INSERT INTO operator_company (name, rut, contact_info)
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [name, rut, contactInfo]
    );
    return result.rows[0];
}
async function updateOperator(operatorCompanyId, name, rut, contactInfo) {
    const result = await pool.query(
        `
        UPDATE operator_company
        SET name = $2, rut = $3, contact_info = $4
        WHERE operator_company_id = $1
        RETURNING *
        `,
        [operatorCompanyId, name, rut, contactInfo]
    );
    return result.rows[0];
}
async function deleteOperator(operatorCompanyId) {
    const result = await pool.query(
        `DELETE FROM operator_company WHERE operator_company_id = $1 RETURNING *`,
        [operatorCompanyId]
    );
    return result.rows[0];
}

async function findCoverageById(coverageId) {
    const result = await pool.query(
        `SELECT * FROM operator_coverage WHERE coverage_id = $1`,
        [coverageId]
    );
    return result.rows[0];
}
async function findCoveragesByOperator(operatorCompanyId) {
    const result = await pool.query(
        `
        SELECT oc.*, c.name AS condominium_name
        FROM operator_coverage oc
        JOIN condominium c ON c.condominium_id = oc.condominium_id
        WHERE oc.operator_company_id = $1
        ORDER BY oc.valid_from
        `,
        [operatorCompanyId]
    );
    return result.rows;
}
async function findCoveragesByCondominium(condominiumId) {
    const result = await pool.query(
        `
        SELECT oc.*, op.name AS operator_name
        FROM operator_coverage oc
        JOIN operator_company op ON op.operator_company_id = oc.operator_company_id
        WHERE oc.condominium_id = $1
        ORDER BY oc.valid_from
        `,
        [condominiumId]
    );
    return result.rows;
}
async function createCoverage(operatorCompanyId, condominiumId, days, startTime, endTime, validFrom, validUntil) {
    const result = await pool.query(
        `
        INSERT INTO operator_coverage
            (operator_company_id, condominium_id, days, start_time, end_time, valid_from, valid_until)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        `,
        [operatorCompanyId, condominiumId, days, startTime, endTime, validFrom, validUntil]
    );
    return result.rows[0];
}
async function updateCoverage(coverageId, days, startTime, endTime, validFrom, validUntil) {
    const result = await pool.query(
        `
        UPDATE operator_coverage
        SET days = $2, start_time = $3, end_time = $4, valid_from = $5, valid_until = $6
        WHERE coverage_id = $1
        RETURNING *
        `,
        [coverageId, days, startTime, endTime, validFrom, validUntil]
    );
    return result.rows[0];
}
async function deleteCoverage(coverageId) {
    const result = await pool.query(
        `DELETE FROM operator_coverage WHERE coverage_id = $1 RETURNING *`,
        [coverageId]
    );
    return result.rows[0];
}

module.exports = {
    // Companies
    findOperatorById, findOperators, createOperator, updateOperator, deleteOperator,
    // Coverage
    findCoverageById, findCoveragesByOperator, findCoveragesByCondominium, createCoverage, updateCoverage, deleteCoverage,
};