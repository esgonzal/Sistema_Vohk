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
        INSERT INTO app_user (
            username,
            password_hash,
            rut,
            sip_identity,
            email,
            legal_name,
            role
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            'resident'
        )
        RETURNING *
        `,
        [username, passwordHash, rut, sipIdentity, email, legalName]
    );
    return result.rows[0];
}
async function updateResident(userId, email, legalName, sip_identity, active) {
    const result = await pool.query(
        `
        UPDATE app_user
        SET
            email = $2,
            legal_name = $3,
            sip_identity = $4,
            active = $5
        WHERE user_id = $1
          AND role = 'resident'
        RETURNING *
        `,
        [userId, email, legalName, sip_identity, active]
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
async function findUsersByUnit(unitId) {
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

        WHERE ru.unit_id = $1

        ORDER BY
            ru.is_primary DESC,
            u.legal_name
        `,
        [unitId]
    );
    return result.rows;
}


module.exports = {
    findById, findByUsername, findByRut, findByIdentity, updateFcmToken, fetchPrimaryUnit, createResident, updateResident, assignResidentToUnit,
    deleteResident, findUsersByUnit
};