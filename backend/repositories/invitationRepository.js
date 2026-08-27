const pool = require('../database/db');

async function findById(invitationId) {
    const result = await pool.query(
        `
        SELECT
            i.*,
            v.name AS visitor_name,
            v.rut AS visitor_rut,
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
            v.rut AS visitor_rut,
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
            d.username,
            d.password_encrypted,
            i.door_id,
            id.provision_status,
            id.removal_status,
            id.last_error,
            id.last_attempt_at
        FROM invitation_device id
        INNER JOIN device d ON d.device_id = id.device_id
        INNER JOIN intercom i ON i.device_id = d.device_id
        WHERE id.invitation_id = $1
        ORDER BY d.name
        `,
        [invitationId]
    );
    return result.rows;
}

async function getCondominiumSettings(condominiumId) {
    const result = await pool.query(
        `
        SELECT
            condominium_id,
            max_temporary_duration_hours,
            max_express_duration_hours
        FROM condominium
        WHERE condominium_id = $1
        `,
        [condominiumId]
    );
    return result.rows[0];
}

async function createInvitationWithDevices({ visitorId, unitId, createdByUserId, residentUserId, employeeNo, dynamicCode, hasFace, biometricConsentAt, type, validFrom, validUntil, deviceIds }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const invitationResult = await client.query(
            `
            INSERT INTO invitation (
                visitor_id,
                unit_id,
                created_by_user_id,
                resident_user_id,
                hikvision_employee_no,
                dynamic_code,
                has_face,
                biometric_consent_at,
                type,
                status,
                valid_from,
                valid_until
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10,$11)
            RETURNING *
            `,
            [visitorId, unitId, createdByUserId, residentUserId, employeeNo, dynamicCode, hasFace, biometricConsentAt, type, validFrom, validUntil]
        );
        const invitation = invitationResult.rows[0];
        await client.query(
            `
            INSERT INTO invitation_device (invitation_id,device_id,provision_status)
            SELECT
                $1,
                UNNEST($2::uuid[]),
                'provisioned'
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

async function markRevoked(invitationId) {
    const result = await pool.query(
        `
        UPDATE invitation
        SET status = 'revoked'
        WHERE invitation_id = $1
          AND status <> 'revoked'
        RETURNING *
        `,
        [invitationId]
    );
    return result.rows[0];
}

async function findExpiredActiveInvitations() {
    const result = await pool.query(
        `
        SELECT *
        FROM invitation
        WHERE status = 'active'
          AND valid_until IS NOT NULL
          AND valid_until <= NOW()
        ORDER BY valid_until
        `
    );
    return result.rows;
}

async function markExpired(invitationId) {
    const result = await pool.query(
        `
        UPDATE invitation
        SET status = 'expired'
        WHERE invitation_id = $1
          AND status = 'active'
        RETURNING *
        `,
        [invitationId]
    );
    return result.rows[0];
}

async function findActiveByResidentUnit(residentUserId, unitId) {
    const result = await pool.query(
        `
        SELECT *
        FROM invitation
        WHERE resident_user_id = $1
          AND unit_id = $2
          AND status = 'active'
        ORDER BY created_at
        `,
        [residentUserId, unitId]
    );
    return result.rows;
}

module.exports = {
    findById, findByUnitId, findIntercoms, getCondominiumSettings, createInvitationWithDevices, markRevoked,
    findExpiredActiveInvitations, markExpired, findActiveByResidentUnit,
};