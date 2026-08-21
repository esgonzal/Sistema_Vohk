const pool = require('../database/db');

async function upsertDevice(userId, platform, fcmToken, deviceName = null) {
    const result = await pool.query(`
        INSERT INTO user_device (user_id, platform, fcm_token, device_name, active, last_seen_at, updated_at)
        VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
        ON CONFLICT (fcm_token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, device_name = EXCLUDED.device_name, active = TRUE, last_seen_at = NOW(), updated_at = NOW()
        RETURNING *
    `, [userId, platform, fcmToken, deviceName]);
    return result.rows[0];
}

async function deactivateDevice(userId, fcmToken) {
    const result = await pool.query(`
        UPDATE user_device 
        SET active = FALSE, updated_at = NOW() 
        WHERE user_id = $1 AND fcm_token = $2 
        RETURNING *
    `, [userId, fcmToken]);
    return result.rows[0] || null;
}

async function findActiveByUserId(userId) {
    const result = await pool.query(`
        SELECT user_device_id, user_id, platform, fcm_token, device_name, last_seen_at 
        FROM user_device 
        WHERE user_id = $1 AND active = TRUE 
        ORDER BY created_at
    `, [userId]);
    return result.rows;
}

async function deactivateDeviceById(userDeviceId) {
    const result = await pool.query(`
        UPDATE user_device
        SET active = FALSE,
            updated_at = NOW()
        WHERE user_device_id = $1
        RETURNING *
    `, [userDeviceId]);
    return result.rows[0] || null;
}

module.exports = { upsertDevice, deactivateDevice, findActiveByUserId, deactivateDeviceById };