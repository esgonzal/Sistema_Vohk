const pool = require('../database/db');

async function findAll() {
    const result = await pool.query(`
        SELECT *
        FROM invitation
        ORDER BY created_at DESC
    `);
    return result.rows;
}
async function findById(invitationId) {
    const result = await pool.query(
        `
        SELECT *
        FROM invitation
        WHERE invitation_id = $1
        `,
        [invitationId]
    );
    return result.rows[0];
}
async function create({ unitId, createdByUserId, validFrom, validUntil, type = 'visit' }) {
    const result = await pool.query(
        `
        INSERT INTO invitation (
            unit_id,
            created_by_user_id,
            type,
            status,
            valid_from,
            valid_until
        )
        VALUES (
            $1,
            $2,
            $3,
            'pending',
            $4,
            $5
        )
        RETURNING *
        `,
        [unitId, createdByUserId, type, validFrom, validUntil]
    );
    return result.rows[0];
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
        WHERE invitation_id = $1 AND status = 'pending'
        RETURNING *
        `,
        [invitationId, visitorId, hikvisionEmployeeNo, dynamicCode]
    );
    return result.rows[0];
}
async function deleteInvitation(invitationId) {
    await pool.query(
        `
        DELETE FROM invitation
        WHERE invitation_id = $1
        `,
        [invitationId]
    );
}
async function assignDevice(invitationId, deviceId) {
    await pool.query(
        `
        INSERT INTO invitation_device (invitation_id, device_id)
        VALUES ($1, $2)
        `,
        [invitationId, deviceId]
    );
}
async function findDevices(invitationId) {
    const result = await pool.query(
        `
        SELECT
            d.*
        FROM invitation_device id
        JOIN device d
            ON d.device_id = id.device_id
        WHERE id.invitation_id = $1
        `,
        [invitationId]
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
        JOIN device d
            ON d.device_id = id.device_id
        JOIN intercom i
            ON i.device_id = d.device_id
        WHERE id.invitation_id = $1
        `,
        [invitationId]
    );
    return result.rows;
}
async function findFirstIntercom(invitationId) {
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
        JOIN device d
            ON d.device_id = id.device_id
        JOIN intercom i
            ON i.device_id = d.device_id
        WHERE id.invitation_id = $1
        LIMIT 1
        `,
        [invitationId]
    );
    return result.rows[0];
}

module.exports = { findAll, findById, create, registerVisitor, deleteInvitation, assignDevice, findDevices, findIntercoms, findFirstIntercom, };