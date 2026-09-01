const pool = require('../database/db');

function dteSnapshot(dte) {
    return {
        type_document: dte.type_document ?? null,
        folio: dte.folio ?? null,
        status: dte.status ?? null,
        start_date: dte.start_date ?? null,
        end_date: dte.end_date ?? null,
    };
}

async function withAdvisoryLock(lockName, callback) {
    const client = await pool.connect();
    let acquired = false;
    try {
        const result = await client.query(
            'SELECT pg_try_advisory_lock(hashtext($1)) AS acquired',
            [lockName],
        );
        acquired = result.rows[0]?.acquired === true;
        if (!acquired) return { acquired: false, value: null };
        return { acquired: true, value: await callback() };
    } finally {
        if (acquired) {
            await client.query('SELECT pg_advisory_unlock(hashtext($1))', [lockName]);
        }
        client.release();
    }
}

async function getCursor(typeDocument) {
    const result = await pool.query(`
        INSERT INTO dte_sync_cursor (type_document, last_folio)
        VALUES ($1, 0)
        ON CONFLICT (type_document) DO UPDATE
            SET type_document = EXCLUDED.type_document
        RETURNING last_folio
    `, [typeDocument]);
    return Number(result.rows[0].last_folio);
}

async function advanceCursor(typeDocument, folio) {
    await pool.query(`
        INSERT INTO dte_sync_cursor (type_document, last_folio)
        VALUES ($1, $2)
        ON CONFLICT (type_document) DO UPDATE
            SET last_folio = GREATEST(dte_sync_cursor.last_folio, EXCLUDED.last_folio),
                updated_at = NOW()
    `, [typeDocument, folio]);
}

async function setCursor(typeDocument, folio) {
    await pool.query(`
        INSERT INTO dte_sync_cursor (type_document, last_folio)
        VALUES ($1, $2)
        ON CONFLICT (type_document) DO UPDATE
            SET last_folio = EXCLUDED.last_folio,
                updated_at = NOW()
    `, [typeDocument, folio]);
}

async function findItem(typeDocument, folio) {
    const result = await pool.query(`
        SELECT * FROM dte_sync_item
        WHERE type_document = $1 AND folio = $2
    `, [typeDocument, folio]);
    return result.rows[0] || null;
}

async function savePending({ typeDocument, folio, boardId, mondayItemId = null, dte = {} }) {
    const result = await pool.query(`
        INSERT INTO dte_sync_item (
            type_document, folio, board_id, monday_item_id, relbase_status,
            start_date, end_date, sync_status, last_attempt_at, relbase_payload
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing', NOW(), $8::jsonb)
        ON CONFLICT (type_document, folio) DO UPDATE SET
            board_id = EXCLUDED.board_id,
            monday_item_id = COALESCE(dte_sync_item.monday_item_id, EXCLUDED.monday_item_id),
            relbase_status = EXCLUDED.relbase_status,
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            sync_status = 'processing',
            last_error = NULL,
            last_attempt_at = NOW(),
            relbase_payload = EXCLUDED.relbase_payload,
            updated_at = NOW()
        RETURNING *
    `, [
        typeDocument,
        folio,
        boardId,
        mondayItemId,
        dte.status || null,
        dte.start_date || null,
        dte.end_date || null,
        JSON.stringify(dteSnapshot(dte)),
    ]);
    return result.rows[0];
}

async function setMondayItem(typeDocument, folio, mondayItemId) {
    const result = await pool.query(`
        UPDATE dte_sync_item
        SET monday_item_id = $3, updated_at = NOW()
        WHERE type_document = $1 AND folio = $2
          AND (monday_item_id IS NULL OR monday_item_id = $3)
        RETURNING *
    `, [typeDocument, folio, mondayItemId]);
    return result.rows[0] || null;
}

async function markSynced(typeDocument, folio, dte) {
    await pool.query(`
        UPDATE dte_sync_item
        SET relbase_status = $3,
            start_date = $4,
            end_date = $5,
            sync_status = 'synced',
            last_error = NULL,
            last_synced_at = NOW(),
            relbase_payload = $6::jsonb,
            updated_at = NOW()
        WHERE type_document = $1 AND folio = $2
    `, [
        typeDocument,
        folio,
        dte.status || null,
        dte.start_date || null,
        dte.end_date || null,
        JSON.stringify(dteSnapshot(dte)),
    ]);
}

async function markFailed(typeDocument, folio, error) {
    await pool.query(`
        UPDATE dte_sync_item
        SET sync_status = 'failed',
            last_error = $3,
            updated_at = NOW()
        WHERE type_document = $1 AND folio = $2
    `, [typeDocument, folio, String(error?.message || error).slice(0, 4000)]);
}

async function listTrackedItems() {
    const result = await pool.query(`
        SELECT * FROM dte_sync_item
        WHERE monday_item_id IS NOT NULL
        ORDER BY type_document, folio
    `);
    return result.rows;
}

async function removeItem(typeDocument, folio) {
    await pool.query(
        'DELETE FROM dte_sync_item WHERE type_document = $1 AND folio = $2',
        [typeDocument, folio],
    );
}

module.exports = {
    advanceCursor,
    findItem,
    getCursor,
    listTrackedItems,
    markFailed,
    markSynced,
    removeItem,
    savePending,
    setCursor,
    setMondayItem,
    withAdvisoryLock,
};
