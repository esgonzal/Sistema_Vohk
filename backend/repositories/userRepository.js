const pool = require('../database/db');

async function findById(userId) {
    const result = await pool.query(`
        SELECT * 
        FROM app_user 
        WHERE user_id = $1
    `, [userId]);
    return result.rows[0];
}

async function findByUsername(username) {
    const result = await pool.query(`
        SELECT * 
        FROM app_user 
        WHERE username = $1
    `, [username]);
    return result.rows[0];
}

async function findByRut(rut) {
    const result = await pool.query(`
        SELECT * 
        FROM app_user 
        WHERE rut = $1
    `, [rut]);
    return result.rows[0];
}

async function findByIdentity(sipIdentity) {
    const result = await pool.query(`SELECT * FROM app_user WHERE sip_identity = $1`, [sipIdentity]);
    return result.rows[0];
}

async function findByEmail(email) {
    const result = await pool.query(`
        SELECT * 
        FROM app_user 
        WHERE LOWER(email) = LOWER($1) 
        LIMIT 1
    `, [email]);
    return result.rows[0] || null;
}

async function findByPasswordResetToken(tokenHash) {
    const result = await pool.query(`
        SELECT * 
        FROM app_user 
        WHERE password_reset_token_hash = $1 
        LIMIT 1
    `, [tokenHash]);
    return result.rows[0] || null;
}

async function createResident(username, passwordHash, rut, sipIdentity, email, legalName) {
    const result = await pool.query(`
        INSERT INTO app_user (username, password_hash, rut, sip_identity, email, legal_name, role) 
        VALUES ($1, $2, $3, $4, $5, $6, 'resident') 
        RETURNING *
    `, [username, passwordHash, rut, sipIdentity, email, legalName]);
    return result.rows[0];
}

async function updateResident(userId, email, legalName) {
    const result = await pool.query(`
        UPDATE app_user 
        SET email = $2, legal_name = $3 
        WHERE user_id = $1 AND role = 'resident' 
        RETURNING *
    `, [userId, email, legalName]);
    return result.rows[0];
}

async function savePasswordResetToken(userId, tokenHash, expiresAt) {
    await pool.query(`
        UPDATE app_user 
        SET password_reset_token_hash = $2, password_reset_expires_at = $3 
        WHERE user_id = $1
    `, [userId, tokenHash, expiresAt]);
}

async function resetPassword(userId, passwordHash) {
    await pool.query(`
        UPDATE app_user 
        SET password_hash = $2, password_reset_token_hash = NULL, password_reset_expires_at = NULL 
        WHERE user_id = $1
    `, [userId, passwordHash]);
}

async function updateUsername(userId, username) {
    const result = await pool.query(`
        UPDATE app_user 
        SET username = $2 
        WHERE user_id = $1 
        RETURNING user_id, username
    `, [userId, username]);
    return result.rows[0];
}

async function updateEmail(userId, email) {
    const result = await pool.query(`
        UPDATE app_user 
        SET email = $2 
        WHERE user_id = $1 
        RETURNING user_id, email
    `, [userId, email]);
    return result.rows[0];
}

async function updatePassword(userId, passwordHash) {
    await pool.query(`
        UPDATE app_user 
        SET password_hash = $2 
        WHERE user_id = $1
    `, [userId, passwordHash]);
}

async function getUsersByCondominium(condominiumId) {
    const result = await pool.query(`
        SELECT u.user_id, u.legal_name, u.username, u.rut, u.sip_identity, u.role, u.email, u.active, u.created_at, JSON_AGG(JSON_BUILD_OBJECT('buildingId', b.building_id, 'building', b.name, 'unitId', un.unit_id, 'unit', un.name, 'roomNo', un.room_no, 'floor', un.floor, 'isPrimary', ru.is_primary) ORDER BY ru.is_primary DESC, b.name, un.floor, un.room_no) AS locations
        FROM app_user u
        INNER JOIN resident_unit ru ON ru.user_id = u.user_id
        INNER JOIN unit un ON un.unit_id = ru.unit_id
        INNER JOIN building b ON b.building_id = un.building_id
        INNER JOIN condominium c ON c.condominium_id = b.condominium_id
        WHERE c.condominium_id = $1
        GROUP BY u.user_id, u.legal_name, u.username, u.rut, u.sip_identity, u.role, u.email, u.active, u.created_at
        ORDER BY u.legal_name
    `, [condominiumId]);
    return result.rows;
}

async function findCallCondominium(callerUserId, recipientUserId) {
    const result = await pool.query(`
        SELECT c.condominium_id
        FROM resident_unit recipient_ru
        INNER JOIN unit recipient_unit ON recipient_unit.unit_id = recipient_ru.unit_id
        INNER JOIN building recipient_building ON recipient_building.building_id = recipient_unit.building_id
        INNER JOIN condominium c ON c.condominium_id = recipient_building.condominium_id
        INNER JOIN app_user caller ON caller.user_id = $1
        WHERE recipient_ru.user_id = $2
          AND (
              caller.role = 'superadmin'
              OR (caller.role = 'admin' AND c.admin_user_id = caller.user_id)
              OR (caller.role = 'resident' AND EXISTS (
                  SELECT 1
                  FROM resident_unit caller_ru
                  INNER JOIN unit caller_unit ON caller_unit.unit_id = caller_ru.unit_id
                  INNER JOIN building caller_building ON caller_building.building_id = caller_unit.building_id
                  WHERE caller_ru.user_id = caller.user_id
                    AND caller_building.condominium_id = c.condominium_id
              ))
          )
        ORDER BY c.name
        LIMIT 1
    `, [callerUserId, recipientUserId]);
    return result.rows[0] || null;
}

module.exports = { 
    findById, findByUsername, findByRut, findByIdentity, findByEmail, findByPasswordResetToken, 
    createResident, updateResident, savePasswordResetToken, resetPassword, updateUsername, updateEmail, updatePassword, getUsersByCondominium, findCallCondominium };
