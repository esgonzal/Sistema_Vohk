const pool = require('../database/db');

async function findById(invitationId) {
    const result = await pool.query(
        `
        SELECT
            i.*,
            v.name AS visitor_name,
            v.email AS visitor_email,
            v.phone AS visitor_phone,
            v.vehicle_plate
        FROM invitation i
        LEFT JOIN visitor v ON v.visitor_id = i.visitor_id
        WHERE i.invitation_id = $1
        `,
        [invitationId]
    );
    return result.rows[0];
}
async function findByUnitId(unitId) {
    const result = await pool.query(
        `
        SELECT
            i.*,
            v.name AS visitor_name,
            v.email AS visitor_email,
            v.phone AS visitor_phone,
            v.vehicle_plate
        FROM invitation i
        LEFT JOIN visitor v ON v.visitor_id = i.visitor_id
        WHERE i.unit_id = $1
        ORDER BY i.created_at DESC
        `,
        [unitId]
    );
    return result.rows;
}
async function findIntercoms(invitationId) {
    const result = await pool.query(
        `
        SELECT
            d.device_id,
            d.name,
            d.ip_address,
            d.port,
            d.snapshot_url,
            d.stream_url,
            i.intercom_id,
            i.sip_address,
            i.username,
            i.password_encrypted,
            i.door_id
        FROM invitation_device id
        JOIN device d ON d.device_id = id.device_id
        JOIN intercom i ON i.device_id = d.device_id
        WHERE id.invitation_id = $1
        ORDER BY d.name
        `,
        [invitationId]
    );
    return result.rows;
}
async function createWithDevices({ unitId, createdByUserId, validFrom, validUntil, type, deviceIds }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const invitationResult = await client.query(
            `
            INSERT INTO invitation (
                unit_id,
                created_by_user_id,
                type,
                status,
                valid_from,
                valid_until
            )
            VALUES ($1, $2, $3, 'pending', $4, $5)
            RETURNING *
            `,
            [unitId, createdByUserId, type, validFrom, validUntil]
        );
        const invitation = invitationResult.rows[0];
        await client.query(
            `
            INSERT INTO invitation_device (invitation_id, device_id)
            SELECT $1, UNNEST($2::uuid[])
            `,
            [invitation.invitation_id, deviceIds]
        );
        await client.query('COMMIT');
        return invitation;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
async function registerVisitor(invitationId, visitorId, hikvisionEmployeeNo, dynamicCode) {
    const result = await pool.query(
        `
        UPDATE invitation
        SET
            visitor_id = $2,
            hikvision_employee_no = $3,
            dynamic_code = $4,
            status = 'registered'
        WHERE invitation_id = $1
          AND status = 'pending'
          AND valid_until > NOW()
        RETURNING *
        `,
        [invitationId, visitorId, hikvisionEmployeeNo, dynamicCode]
    );
    return result.rows[0];
}
async function deleteInvitation(invitationId) {
    const result = await pool.query(
        `
        DELETE FROM invitation
        WHERE invitation_id = $1
        RETURNING *
        `,
        [invitationId]
    );
    return result.rows[0];
}

module.exports = { findById, findByUnitId, findIntercoms, createWithDevices, registerVisitor, deleteInvitation };