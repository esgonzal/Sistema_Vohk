const pool = require('../database/db');

const SUMMARY_SELECT = `
    SELECT e.encomienda_id, e.unit_id, e.recipient_name, e.courier_name, e.notes,
           e.photo_mime_type, e.status, e.created_at, e.updated_at, e.delivered_at,
           e.cancelled_at, e.cancellation_reason,
           u.name AS unit_name, u.room_no, b.name AS building_name,
           c.condominium_id, c.name AS condominium_name,
           creator.legal_name AS created_by_name,
           staff.legal_name AS delivered_by_name,
           resident.legal_name AS delivered_to_resident_name
    FROM encomienda e
    JOIN unit u ON u.unit_id = e.unit_id
    JOIN building b ON b.building_id = u.building_id
    JOIN condominium c ON c.condominium_id = b.condominium_id
    JOIN app_user creator ON creator.user_id = e.created_by_user_id
    LEFT JOIN app_user staff ON staff.user_id = e.delivered_by_user_id
    LEFT JOIN app_user resident ON resident.user_id = e.delivered_to_resident_user_id`;

async function create({ unitId, createdByUserId, recipientName, courierName, notes, photoBytes, photoMimeType }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(`
            INSERT INTO encomienda (
                unit_id, created_by_user_id, recipient_name, courier_name, notes,
                photo_bytes, photo_mime_type, last_notified_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING *
        `, [unitId, createdByUserId, recipientName, courierName, notes, photoBytes, photoMimeType]);
        const encomienda = result.rows[0];
        await client.query(`
            INSERT INTO encomienda_event (encomienda_id, event_type, actor_user_id)
            VALUES ($1, 'created', $2)
        `, [encomienda.encomienda_id, createdByUserId]);
        await client.query('COMMIT');
        return encomienda;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function findById(encomiendaId) {
    const result = await pool.query(`${SUMMARY_SELECT} WHERE e.encomienda_id = $1`, [encomiendaId]);
    return result.rows[0] || null;
}

async function listByUnit(unitId, includeHistory) {
    const statusClause = includeHistory ? '' : `AND e.status = 'pending'`;
    const result = await pool.query(`${SUMMARY_SELECT} WHERE e.unit_id = $1 ${statusClause} ORDER BY e.created_at DESC`, [unitId]);
    return result.rows;
}

async function getPhoto(encomiendaId) {
    const result = await pool.query(`SELECT photo_bytes, photo_mime_type FROM encomienda WHERE encomienda_id = $1`, [encomiendaId]);
    return result.rows[0] || null;
}

async function deliver({ encomiendaId, staffUserId, residentUserId }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const locked = await client.query(`SELECT * FROM encomienda WHERE encomienda_id = $1 FOR UPDATE`, [encomiendaId]);
        const current = locked.rows[0];
        if (!current) {
            await client.query('ROLLBACK');
            return { outcome: 'not_found' };
        }
        if (current.status !== 'pending') {
            await client.query('ROLLBACK');
            return { outcome: current.status, encomienda: current };
        }
        const relation = await client.query(`SELECT 1 FROM resident_unit WHERE user_id = $1 AND unit_id = $2`, [residentUserId, current.unit_id]);
        if (!relation.rowCount) {
            await client.query('ROLLBACK');
            return { outcome: 'resident_not_assigned' };
        }
        const updated = await client.query(`
            UPDATE encomienda
            SET status = 'delivered', delivered_by_user_id = $2,
                delivered_to_resident_user_id = $3, delivered_at = NOW(), updated_at = NOW()
            WHERE encomienda_id = $1
            RETURNING *
        `, [encomiendaId, staffUserId, residentUserId]);
        await client.query(`
            INSERT INTO encomienda_event (encomienda_id, event_type, actor_user_id, resident_user_id)
            VALUES ($1, 'delivered', $2, $3)
        `, [encomiendaId, staffUserId, residentUserId]);
        await client.query('COMMIT');
        return { outcome: 'delivered', encomienda: updated.rows[0] };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function cancel({ encomiendaId, actorUserId, reason }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(`
            UPDATE encomienda
            SET status = 'cancelled', cancelled_by_user_id = $2, cancelled_at = NOW(),
                cancellation_reason = $3, updated_at = NOW()
            WHERE encomienda_id = $1 AND status = 'pending'
            RETURNING *
        `, [encomiendaId, actorUserId, reason]);
        if (!result.rowCount) {
            await client.query('ROLLBACK');
            return null;
        }
        await client.query(`
            INSERT INTO encomienda_event (encomienda_id, event_type, actor_user_id, metadata)
            VALUES ($1, 'cancelled', $2, jsonb_build_object('reason', $3::text))
        `, [encomiendaId, actorUserId, reason]);
        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function findResidentsByUnit(unitId) {
    const result = await pool.query(`
        SELECT au.user_id, au.legal_name
        FROM resident_unit ru
        JOIN app_user au ON au.user_id = ru.user_id
        WHERE ru.unit_id = $1 AND au.active = TRUE
        ORDER BY au.legal_name
    `, [unitId]);
    return result.rows;
}

async function findDueReminders(hours) {
    const result = await pool.query(`
        SELECT e.encomienda_id, e.unit_id, e.created_by_user_id, u.name AS unit_name
        FROM encomienda e
        JOIN unit u ON u.unit_id = e.unit_id
        WHERE e.status = 'pending'
          AND COALESCE(e.last_notified_at, e.created_at) <= NOW() - ($1::text || ' hours')::interval
        ORDER BY COALESCE(e.last_notified_at, e.created_at)
        LIMIT 200
    `, [hours]);
    return result.rows;
}

async function markNotified(encomiendaId, actorUserId, residentIds, reminder) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`UPDATE encomienda SET last_notified_at = NOW(), updated_at = NOW() WHERE encomienda_id = $1 AND status = 'pending'`, [encomiendaId]);
        await client.query(`
            INSERT INTO encomienda_event (encomienda_id, event_type, actor_user_id, metadata)
            VALUES ($1, 'notified', $2, jsonb_build_object('residentIds', $3::jsonb, 'reminder', $4::boolean))
        `, [encomiendaId, actorUserId, JSON.stringify(residentIds), reminder]);
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { create, findById, listByUnit, getPhoto, deliver, cancel, findResidentsByUnit, findDueReminders, markNotified };
