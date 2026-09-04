const pool = require('../database/db');

async function findRegisteredLockIds() {
    const result = await pool.query('SELECT lock_id FROM ttlock_lock');
    return result.rows.map(row => String(row.lock_id));
}

async function createLock(deviceId, lock) {
    const result = await pool.query(`
        INSERT INTO ttlock_lock (
            device_id, lock_id, key_id, lock_alias, lock_mac,
            keyboard_pwd_version, special_value, has_gateway, remote_enabled,
            account_scope, metadata, last_synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, NOW())
        RETURNING *
    `, [
        deviceId,
        lock.lockId,
        lock.keyId || null,
        lock.lockAlias || null,
        lock.lockMac || null,
        lock.keyboardPwdVersion ?? null,
        lock.specialValue ?? null,
        Number(lock.hasGateway) === 1 || lock.hasGateway === true,
        Number(lock.remoteEnable) === 1 || lock.remoteEnabled === true,
        lock.accountScope || 'condominiums-master',
        JSON.stringify(lock.metadata || {}),
    ]);
    return result.rows[0];
}

async function findByDeviceId(deviceId) {
    const result = await pool.query(`
        SELECT tl.*, d.type, d.name AS device_name, d.active, d.zone_id,
               z.condominium_id, c.name AS condominium_name
        FROM ttlock_lock tl
        INNER JOIN device d ON d.device_id = tl.device_id
        INNER JOIN zone z ON z.zone_id = d.zone_id
        INNER JOIN condominium c ON c.condominium_id = z.condominium_id
        WHERE tl.device_id = $1
    `, [deviceId]);
    return result.rows[0];
}

async function findSyncablePasscodeLocks() {
    const result = await pool.query(`
        SELECT tl.ttlock_lock_id, tl.lock_id, tl.device_id, tl.records_synced_at,
               d.type, d.name AS device_name, z.condominium_id
        FROM ttlock_lock tl
        INNER JOIN device d ON d.device_id = tl.device_id
        INNER JOIN zone z ON z.zone_id = d.zone_id
        WHERE d.active = TRUE
          AND d.type = 'lock'
        ORDER BY d.device_id
    `);
    return result.rows;
}

async function markPasscodeRecordsSynced(deviceId, syncedAt) {
    const result = await pool.query(`
        UPDATE ttlock_lock
        SET records_synced_at = $2,
            updated_at = NOW()
        WHERE device_id = $1
        RETURNING records_synced_at
    `, [deviceId, syncedAt]);
    return result.rows[0]?.records_synced_at || null;
}

async function resolvePasscodeSubject(deviceId, keyboardPwd, keyboardPwdName, occurredAt) {
    if (!keyboardPwd && !keyboardPwdName) return null;
    const result = await pool.query(`
        SELECT tp.assigned_user_id AS actor_user_id,
               au.legal_name AS subject_name,
               tp.purpose,
               tp.keyboard_pwd_name
        FROM ttlock_passcode tp
        INNER JOIN ttlock_lock tl ON tl.ttlock_lock_id = tp.ttlock_lock_id
        LEFT JOIN app_user au ON au.user_id = tp.assigned_user_id
        WHERE tl.device_id = $1
          AND (
              ($2::text IS NOT NULL AND tp.keyboard_pwd = $2)
              OR ($3::text IS NOT NULL AND tp.keyboard_pwd_name = $3)
          )
          AND (tp.status <> 'deleted' OR tp.updated_at >= $4)
          AND (tp.valid_from IS NULL OR tp.valid_from <= $4)
          AND (tp.valid_until IS NULL OR tp.valid_until >= $4)
        ORDER BY (tp.keyboard_pwd = $2) DESC,
                 (tp.assigned_user_id IS NOT NULL) DESC,
                 tp.updated_at DESC
        LIMIT 1
    `, [deviceId, keyboardPwd ? String(keyboardPwd) : null, keyboardPwdName || null, occurredAt]);
    return result.rows[0] || null;
}

async function updateLockFromAccount(deviceId, lock) {
    const result = await pool.query(`
        UPDATE ttlock_lock
        SET key_id = $2,
            lock_alias = $3,
            lock_mac = $4,
            keyboard_pwd_version = $5,
            special_value = $6,
            has_gateway = $7,
            remote_enabled = $8,
            metadata = metadata || $9::jsonb,
            last_synced_at = NOW(),
            updated_at = NOW()
        WHERE device_id = $1
        RETURNING *
    `, [
        deviceId,
        lock.keyId || null,
        lock.lockAlias || null,
        lock.lockMac || null,
        lock.keyboardPwdVersion ?? null,
        lock.specialValue ?? null,
        lock.hasGateway === true || Number(lock.hasGateway) === 1,
        lock.remoteEnabled === true || Number(lock.remoteEnable) === 1,
        JSON.stringify(lock.metadata || {}),
    ]);
    return result.rows[0];
}

async function findByResident(userId) {
    const result = await pool.query(`
        SELECT DISTINCT tl.*, d.type, d.name AS device_name, d.active,
               z.condominium_id
        FROM ttlock_lock tl
        INNER JOIN device d ON d.device_id = tl.device_id
        INNER JOIN zone z ON z.zone_id = d.zone_id
        INNER JOIN building b ON b.condominium_id = z.condominium_id
        INNER JOIN unit u ON u.building_id = b.building_id
        INNER JOIN resident_unit ru ON ru.unit_id = u.unit_id
        WHERE ru.user_id = $1
          AND d.active = TRUE
          AND d.type = 'lock'
        ORDER BY d.name
    `, [userId]);
    return result.rows;
}

async function findResidentPasscode(ttlockLockId, userId) {
    const result = await pool.query(`
        SELECT *
        FROM ttlock_passcode
        WHERE ttlock_lock_id = $1
          AND assigned_user_id = $2
          AND purpose = 'resident_dynamic'
          AND status <> 'deleted'
        LIMIT 1
    `, [ttlockLockId, userId]);
    return result.rows[0];
}

async function findResidentPasscodes(userId) {
    const result = await pool.query(`
        SELECT tp.*, tl.device_id
        FROM ttlock_passcode tp
        INNER JOIN ttlock_lock tl ON tl.ttlock_lock_id = tp.ttlock_lock_id
        WHERE tp.assigned_user_id = $1
          AND tp.purpose = 'resident_dynamic'
          AND tp.status = 'active'
        ORDER BY tp.created_at
    `, [userId]);
    return result.rows;
}

async function upsertPasscode({
    ttlockLockId,
    keyboardPwdId,
    keyboardPwd = null,
    keyboardPwdName = null,
    keyboardPwdType = null,
    purpose = 'manual',
    assignedUserId = null,
    createdByUserId = null,
    validFrom = null,
    validUntil = null,
    status = 'active',
}) {
    const result = await pool.query(`
        INSERT INTO ttlock_passcode (
            ttlock_lock_id, keyboard_pwd_id, keyboard_pwd, keyboard_pwd_name,
            keyboard_pwd_type, purpose, assigned_user_id, created_by_user_id,
            valid_from, valid_until, status, last_synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (ttlock_lock_id, keyboard_pwd_id)
        DO UPDATE SET
            keyboard_pwd = EXCLUDED.keyboard_pwd,
            keyboard_pwd_name = EXCLUDED.keyboard_pwd_name,
            keyboard_pwd_type = EXCLUDED.keyboard_pwd_type,
            purpose = EXCLUDED.purpose,
            assigned_user_id = EXCLUDED.assigned_user_id,
            valid_from = EXCLUDED.valid_from,
            valid_until = EXCLUDED.valid_until,
            status = EXCLUDED.status,
            last_synced_at = NOW(),
            updated_at = NOW()
        RETURNING *
    `, [
        ttlockLockId, keyboardPwdId, keyboardPwd, keyboardPwdName,
        keyboardPwdType, purpose, assignedUserId, createdByUserId,
        validFrom, validUntil, status,
    ]);
    return result.rows[0];
}

async function updatePasscode(keyboardPwdId, ttlockLockId, changes) {
    const result = await pool.query(`
        UPDATE ttlock_passcode
        SET keyboard_pwd = COALESCE($3, keyboard_pwd),
            keyboard_pwd_name = COALESCE($4, keyboard_pwd_name),
            valid_from = COALESCE($5, valid_from),
            valid_until = COALESCE($6, valid_until),
            status = COALESCE($7, status),
            last_synced_at = NOW(),
            updated_at = NOW()
        WHERE keyboard_pwd_id = $1 AND ttlock_lock_id = $2
        RETURNING *
    `, [keyboardPwdId, ttlockLockId, changes.keyboardPwd, changes.keyboardPwdName,
        changes.validFrom, changes.validUntil, changes.status]);
    return result.rows[0];
}

async function markPasscodeDeleted(keyboardPwdId, ttlockLockId) {
    const result = await pool.query(`
        UPDATE ttlock_passcode
        SET status = 'deleted', last_synced_at = NOW(), updated_at = NOW()
        WHERE keyboard_pwd_id = $1 AND ttlock_lock_id = $2
        RETURNING *
    `, [keyboardPwdId, ttlockLockId]);
    return result.rows[0];
}

module.exports = {
    findRegisteredLockIds,
    createLock,
    findByDeviceId,
    findSyncablePasscodeLocks,
    markPasscodeRecordsSynced,
    resolvePasscodeSubject,
    updateLockFromAccount,
    findByResident,
    findResidentPasscode,
    findResidentPasscodes,
    upsertPasscode,
    updatePasscode,
    markPasscodeDeleted,
};
