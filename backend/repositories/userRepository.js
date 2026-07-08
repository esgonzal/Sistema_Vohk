const pool = require('../database/db');

async function findById(userId) {
    const result = await pool.query(
        `
        SELECT *
        FROM app_user
        WHERE user_id = $1
        `,
        [userId]
    );
    return result.rows[0];
}
async function findTenantIdByUserId(userId) {
    const result = await pool.query(
        `
        SELECT tenant_id
        FROM condominium
        WHERE admin_user_id = $1
        UNION
        SELECT c.tenant_id
        FROM resident_unit ru
        JOIN unit u
            ON u.unit_id = ru.unit_id
        JOIN building b
            ON b.building_id = u.building_id
        JOIN condominium c
            ON c.condominium_id = b.condominium_id
        WHERE ru.user_id = $1
        LIMIT 1
        `,
        [userId]
    );
    return result.rows[0] || null;
}
async function findByUsername(username) {
    const result = await pool.query(
        `
        SELECT *
        FROM app_user
        WHERE username = $1
        `,
        [username]
    );

    return result.rows[0];
}
async function findByRut(rut) {
    const result = await pool.query(
        `
        SELECT *
        FROM app_user
        WHERE rut = $1
        `,
        [rut]
    );
    return result.rows[0];
}
async function findByIdentity(sip_identity) {
    const result = await pool.query(
        `
        SELECT *
        FROM app_user
        WHERE sip_identity = $1
        `,
        [sip_identity]
    );

    return result.rows[0];
}
async function findByEmail(email) {
    const result = await pool.query(
        `
        SELECT *
        FROM app_user
        WHERE email = $1
        AND active = true
        LIMIT 1
        `,
        [email]
    );
    return result.rows[0] || null;
}
async function findByPasswordResetToken(tokenHash) {
    const result = await pool.query(
        `
        SELECT *
        FROM app_user
        WHERE password_reset_token_hash = $1
        LIMIT 1
        `,
        [tokenHash]
    );
    return result.rows[0] || null;
}
async function updateFcmToken(sip_identity, fcmToken) {
    await pool.query(
        `
        UPDATE app_user
        SET fcm_token = $1
        WHERE sip_identity = $2
        `,
        [fcmToken, sip_identity]
    );
}
async function fetchPrimaryUnit(user_id) {
    const result = await pool.query(
        `
        SELECT unit_id
         FROM resident_unit
         WHERE user_id = $1 AND is_primary = TRUE
         LIMIT 1
        `,
        [user_id]
    );
    return result.rows[0] ?? null;
}
async function createResident(username, passwordHash, rut, sipIdentity, email, legalName) {
    const result = await pool.query(
        `
        INSERT INTO app_user (username,password_hash,rut,sip_identity,email,legal_name,role)
        VALUES ($1,$2,$3,$4,$5,$6,'resident')
        RETURNING *
        `,
        [username, passwordHash, rut, sipIdentity, email, legalName]
    );
    return result.rows[0];
}
async function updateResident(userId, email, legalName, tenantId) {
    const result = await pool.query(
        `
        UPDATE app_user u
        SET
            email = $2,
            legal_name = $3
        WHERE u.user_id = $1
        AND u.role = 'resident'
        AND EXISTS (
            SELECT 1
            FROM resident_unit ru
            JOIN unit un
                ON un.unit_id = ru.unit_id
            JOIN building b
                ON b.building_id = un.building_id
            JOIN condominium c
                ON c.condominium_id = b.condominium_id
            WHERE ru.user_id = u.user_id
                AND c.tenant_id = $4
        )
        RETURNING *;
        `,
        [userId, email, legalName, tenantId]
    );
    return result.rows[0];
}
async function assignResidentToUnit(userId, unitId, isPrimary = false, tenantId) {
    const result = await pool.query(
        `
        INSERT INTO resident_unit (user_id, unit_id, is_primary)
        SELECT $1, $2, $3
        FROM unit u
        JOIN building b ON b.building_id = u.building_id
        JOIN condominium c ON c.condominium_id = b.condominium_id
        WHERE u.unit_id = $2
          AND c.tenant_id = $4
        ON CONFLICT (user_id, unit_id) DO NOTHING
        RETURNING *
        `,
        [userId, unitId, isPrimary, tenantId]
    );
    return result.rows[0];
}
async function deleteResident(userId) {
    const result = await pool.query(
        `
        DELETE FROM app_user
        WHERE user_id = $1
        RETURNING *
        `,
        [userId]
    );
    return result.rows[0];
}
async function findUsersByUnit(unitId, tenantId) {
    const result = await pool.query(
        `
        SELECT
            u.user_id,
            u.username,
            u.rut,
            u.sip_identity,
            u.email,
            u.legal_name,
            u.role,
            u.active,
            ru.is_primary
        FROM resident_unit ru
        JOIN app_user u
            ON u.user_id = ru.user_id
        JOIN unit un
            ON un.unit_id = ru.unit_id
        JOIN building b
            ON b.building_id = un.building_id
        JOIN condominium c
            ON c.condominium_id = b.condominium_id
        WHERE ru.unit_id = $1
          AND c.tenant_id = $2
        ORDER BY
            ru.is_primary DESC,
            u.legal_name
        `,
        [unitId, tenantId]
    );
    return result.rows;
}
async function savePasswordResetToken(userId, tokenHash, expiresAt) {
    await pool.query(
        `
        UPDATE app_user
        SET
            password_reset_token_hash = $2,
            password_reset_expires_at = $3
        WHERE user_id = $1
        `,
        [userId, tokenHash, expiresAt]
    );
}
async function resetPassword(userId, passwordHash) {
    await pool.query(
        `
        UPDATE app_user
        SET
            password_hash = $2,
            password_reset_token_hash = NULL,
            password_reset_expires_at = NULL
        WHERE user_id = $1
        `,
        [userId, passwordHash]
    );
}

module.exports = {
    findById, findTenantIdByUserId, findByUsername, findByRut, findByIdentity, findByEmail, findByPasswordResetToken,
    updateFcmToken, fetchPrimaryUnit, createResident, updateResident, assignResidentToUnit,
    deleteResident, findUsersByUnit, savePasswordResetToken, resetPassword
};