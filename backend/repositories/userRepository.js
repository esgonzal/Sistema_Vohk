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
async function updateFcmToken(userId, fcmToken) {
    const result = await pool.query(
        `
        UPDATE app_user
        SET fcm_token = $2
        WHERE user_id = $1
        RETURNING user_id, sip_identity, fcm_token
        `,
        [userId, fcmToken]
    );
    return result.rows[0] || null;
}
async function clearFcmToken(userId, fcmToken) {
    const result = await pool.query(
        `
        UPDATE app_user
        SET fcm_token = NULL
        WHERE user_id = $1 AND fcm_token = $2
        RETURNING user_id
        `,
        [userId, fcmToken]
    );
    return result.rows[0] || null;
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
            JOIN unit un ON un.unit_id = ru.unit_id
            JOIN building b ON b.building_id = un.building_id
            JOIN condominium c ON c.condominium_id = b.condominium_id
            WHERE ru.user_id = u.user_id AND c.tenant_id = $4
        )
        RETURNING *;
        `,
        [userId, email, legalName, tenantId]
    );
    return result.rows[0];
}
async function assignResidentToUnit(userId, unitId, isPrimary = false) {
    const result = await pool.query(
        `
        INSERT INTO resident_unit (
            user_id,
            unit_id,
            is_primary
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, unit_id) DO NOTHING
        RETURNING *
        `,
        [userId, unitId, isPrimary]
    );
    return result.rows[0];
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
async function updateUsername(userId, username) {
    const result = await pool.query(
        `
        UPDATE app_user
        SET username = $2
        WHERE user_id = $1
        RETURNING user_id, username
        `,
        [userId, username]
    );
    return result.rows[0];
}
async function updateEmail(userId, email) {
    const result = await pool.query(
        `
        UPDATE app_user
        SET email = $2
        WHERE user_id = $1
        RETURNING user_id, email
        `,
        [userId, email]
    );
    return result.rows[0];
}
async function updatePassword(userId, passwordHash) {
    await pool.query(
        `
        UPDATE app_user
        SET password_hash = $2
        WHERE user_id = $1
        `,
        [userId, passwordHash]
    );
}
async function getUsersByCondominium(condominiumId) {
    const result = await pool.query(
        `
        SELECT
            u.user_id,
            u.legal_name,
            u.rut,
            u.role,
            u.email,
            u.active,
            u.created_at,
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'buildingId', b.building_id,
                    'building', b.name,
                    'unitId', un.unit_id,
                    'unit', un.name,
                    'roomNo', un.room_no,
                    'isPrimary', ru.is_primary
                )
                ORDER BY
                    ru.is_primary DESC,
                    b.name,
                    un.room_no
            ) AS locations
        FROM app_user u
        INNER JOIN resident_unit ru ON ru.user_id = u.user_id
        INNER JOIN unit un ON un.unit_id = ru.unit_id
        INNER JOIN building b ON b.building_id = un.building_id
        INNER JOIN condominium c ON c.condominium_id = b.condominium_id
        WHERE c.condominium_id = $1
        GROUP BY u.user_id, u.legal_name, u.rut, u.role, u.email, u.active, u.created_at
        ORDER BY u.created_at DESC
        `,
        [condominiumId]
    );
    return result.rows;
}

module.exports = {
    findById, findByUsername, findByRut, findByIdentity, findByEmail, findByPasswordResetToken,
    updateFcmToken, clearFcmToken, createResident, updateResident, assignResidentToUnit,
    savePasswordResetToken, resetPassword, updateUsername, updateEmail, updatePassword,
    getUsersByCondominium
};