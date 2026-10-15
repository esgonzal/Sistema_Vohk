const pool = require('../database/db');

async function listStaff(condominiumId) {
    const result = await pool.query(`
        SELECT u.user_id, u.legal_name, u.email, u.active
        FROM staff_condominium sc
        INNER JOIN app_user u ON u.user_id = sc.user_id
        WHERE sc.condominium_id = $1 AND u.role = 'staff'
        ORDER BY u.active DESC, u.legal_name
    `, [condominiumId]);
    return result.rows;
}

async function listShifts(condominiumId) {
    const result = await pool.query(`
        SELECT s.shift_id, s.condominium_id, s.name,
               TO_CHAR(s.start_time, 'HH24:MI') AS start_time,
               TO_CHAR(s.end_time, 'HH24:MI') AS end_time,
               s.weekdays, s.enabled, s.created_at, s.updated_at,
               COALESCE(
                   JSON_AGG(JSON_BUILD_OBJECT(
                       'user_id', u.user_id,
                       'legal_name', u.legal_name,
                       'email', u.email,
                       'active', u.active
                   ) ORDER BY u.legal_name) FILTER (WHERE u.user_id IS NOT NULL),
                   '[]'::json
               ) AS staff
        FROM staff_shift s
        LEFT JOIN staff_shift_assignment a ON a.shift_id = s.shift_id
        LEFT JOIN app_user u ON u.user_id = a.user_id
        WHERE s.condominium_id = $1
        GROUP BY s.shift_id
        ORDER BY s.start_time, s.name
    `, [condominiumId]);
    return result.rows;
}

async function saveShift({ shiftId, condominiumId, name, startTime, endTime, weekdays, enabled, staffUserIds }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = shiftId
            ? await client.query(`
                UPDATE staff_shift
                SET name = $3, start_time = $4, end_time = $5, weekdays = $6, enabled = $7, updated_at = NOW()
                WHERE shift_id = $1 AND condominium_id = $2
                RETURNING shift_id
            `, [shiftId, condominiumId, name, startTime, endTime, weekdays, enabled])
            : await client.query(`
                INSERT INTO staff_shift (condominium_id, name, start_time, end_time, weekdays, enabled)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING shift_id
            `, [condominiumId, name, startTime, endTime, weekdays, enabled]);
        if (!result.rows[0]) {
            await client.query('ROLLBACK');
            return null;
        }
        const savedShiftId = result.rows[0].shift_id;
        await client.query('DELETE FROM staff_shift_assignment WHERE shift_id = $1', [savedShiftId]);
        if (staffUserIds.length) {
            const assignmentResult = await client.query(`
                INSERT INTO staff_shift_assignment (shift_id, condominium_id, user_id)
                SELECT $1, $2, sc.user_id
                FROM staff_condominium sc
                INNER JOIN app_user u ON u.user_id = sc.user_id AND u.role = 'staff'
                WHERE sc.condominium_id = $2 AND sc.user_id = ANY($3::uuid[])
                RETURNING user_id
            `, [savedShiftId, condominiumId, staffUserIds]);
            if (assignmentResult.rowCount !== staffUserIds.length) {
                const error = new Error('One or more staff accounts are not assigned to this condominium');
                error.status = 400;
                throw error;
            }
        }
        await client.query('COMMIT');
        return savedShiftId;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function findById(shiftId) {
    const result = await pool.query('SELECT * FROM staff_shift WHERE shift_id = $1', [shiftId]);
    return result.rows[0];
}

async function deleteShift(shiftId, condominiumId) {
    const result = await pool.query(`
        DELETE FROM staff_shift
        WHERE shift_id = $1 AND condominium_id = $2
        RETURNING *
    `, [shiftId, condominiumId]);
    return result.rows[0];
}

module.exports = { listStaff, listShifts, saveShift, findById, deleteShift };
