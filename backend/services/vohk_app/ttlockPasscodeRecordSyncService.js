const crypto = require('crypto');
const ttlockClient = require('../../integrations/ttlock/ttlockClient');
const ttlockRepository = require('../../repositories/ttlockRepository');
const activityRepository = require('../../repositories/activityRepository');

const configuredLookbackDays = Number.parseInt(process.env.ACCESS_EVENT_INITIAL_LOOKBACK_DAYS || '30', 10);
const INITIAL_LOOKBACK_MS = Math.min(Math.max(configuredLookbackDays || 30, 1), 365) * 24 * 60 * 60 * 1000;
const OVERLAP_MS = 5 * 60 * 1000;
const PAGE_SIZE = 100;
const MAX_PAGES = 100;
const PASSCODE_RECORD_TYPES = new Set([4, 48]);

function recordOccurredAt(record) {
    const timestamp = Number(record.lockDate || record.serverDate);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
    return new Date(timestamp);
}

function recordStatus(record) {
    if (Number(record.recordType) === 48) return 'failed';
    if (Number(record.success) === 1) return 'succeeded';
    if (Number(record.success) === 0) return 'failed';
    return 'recorded';
}

function shouldPersistRecord(lock, record) {
    return lock.type === 'lock'
        && PASSCODE_RECORD_TYPES.has(Number(record.recordType))
        && recordOccurredAt(record) !== null;
}

function recordCorrelationId(lock, record) {
    const stable = JSON.stringify({
        lockId: String(lock.lock_id),
        externalRecordId: record.recordId || record.id || null,
        recordType: Number(record.recordType),
        success: record.success ?? null,
        username: record.username || null,
        lockDate: record.lockDate || null,
        serverDate: record.serverDate || null,
    });
    return `${lock.device_id}:${crypto.createHash('sha256').update(stable).digest('hex')}`;
}

function recordMetadata(lock, record, subject) {
    const failed = recordStatus(record) === 'failed';
    return {
        lockId: String(lock.lock_id),
        deviceType: lock.type,
        recordType: Number(record.recordType),
        method: 'pin',
        methodLabel: 'PIN',
        description: failed ? 'PIN rechazado' : 'Acceso mediante PIN',
        subjectName: subject?.subject_name || null,
        subjectType: subject?.purpose || null,
        keyboardPwdName: subject?.keyboard_pwd_name || null,
        passcodeMatched: Boolean(subject),
        serverDate: record.serverDate || null,
    };
}

async function persistPasscodeRecord(lock, record) {
    if (!shouldPersistRecord(lock, record)) return false;
    const occurredAt = recordOccurredAt(record);
    const subject = await ttlockRepository.resolvePasscodeSubject(
        lock.device_id,
        record.keyboardPwd,
        record.keyboardPwdName || record.username,
        occurredAt,
    );
    const participants = subject?.actor_user_id
        ? [{ userId: subject.actor_user_id, role: 'actor' }]
        : [];

    await activityRepository.createActivity({
        condominiumId: lock.condominium_id,
        deviceId: lock.device_id,
        actorUserId: subject?.actor_user_id || null,
        eventType: 'access',
        status: recordStatus(record),
        source: 'ttlock_passcode',
        correlationId: recordCorrelationId(lock, record),
        occurredAt,
        metadata: recordMetadata(lock, record, subject),
        participants,
    });
    return true;
}

async function syncTtlockPasscodeRecords(lock) {
    const now = Date.now();
    const startDate = lock.records_synced_at
        ? Math.max(0, new Date(lock.records_synced_at).getTime() - OVERLAP_MS)
        : now - INITIAL_LOOKBACK_MS;
    const endDate = now + 60_000;
    let imported = 0;

    for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo += 1) {
        const result = await ttlockClient.listUnlockRecords(lock.lock_id, {
            startDate,
            endDate,
            pageNo,
            pageSize: PAGE_SIZE,
        });
        const records = Array.isArray(result.list) ? result.list : [];
        for (const record of records) {
            if (await persistPasscodeRecord(lock, record)) imported += 1;
        }
        const pages = Number(result.pages || 1);
        if (pageNo >= pages || records.length < PAGE_SIZE) break;
    }

    await ttlockRepository.markPasscodeRecordsSynced(lock.device_id, new Date(endDate));

    return { deviceId: lock.device_id, imported };
}

async function syncAllTtlockPasscodeRecords() {
    const locks = await ttlockRepository.findSyncablePasscodeLocks();
    const results = [];
    for (const lock of locks) {
        try {
            results.push(await syncTtlockPasscodeRecords(lock));
        } catch (error) {
            console.error(`[TTLOCK PASSCODE SYNC ${lock.device_id}]`, error.message);
            results.push({ deviceId: lock.device_id, error: error.message });
        }
    }
    return results;
}

module.exports = {
    recordOccurredAt,
    recordStatus,
    shouldPersistRecord,
    recordCorrelationId,
    recordMetadata,
    persistPasscodeRecord,
    syncTtlockPasscodeRecords,
    syncAllTtlockPasscodeRecords,
};
