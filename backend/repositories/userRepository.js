const pool = require('../database/db');

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
async function findByIdentity(identity) {
    const result = await pool.query(
        `
        SELECT *
        FROM app_user
        WHERE identity = $1
        `,
        [identity]
    );

    return result.rows[0];
}
async function updateFcmToken(identity, fcmToken) {
    console.log('Updating FCM', identity, fcmToken);
    await pool.query(
        `
        UPDATE app_user
        SET fcm_token = $1
        WHERE identity = $2
        `,
        [fcmToken, identity]
    );
}
async function fetchPrimaryUnit (user_id) {
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

module.exports = { findByUsername, findByIdentity, updateFcmToken, fetchPrimaryUnit  };