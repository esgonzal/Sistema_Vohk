const pool = require('../database/db');

async function createActivity({ condominiumId, deviceId = null, actorUserId = null, eventType, status, source, correlationId = null, occurredAt = null, metadata = {}, participants = [] }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(`
            INSERT INTO activity_event (
                condominium_id, device_id, actor_user_id, event_type, status,
                source, correlation_id, occurred_at, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()), $9::jsonb)
            ON CONFLICT (source, correlation_id, event_type, status)
                WHERE correlation_id IS NOT NULL
            DO UPDATE SET occurred_at = EXCLUDED.occurred_at,
                          metadata = activity_event.metadata || EXCLUDED.metadata
            RETURNING *
        `, [condominiumId, deviceId, actorUserId, eventType, status, source, correlationId, occurredAt, JSON.stringify(metadata)]);
        const activity = result.rows[0];
        const uniqueParticipants = new Map();
        for (const participant of participants) {
            if (participant?.userId) uniqueParticipants.set(`${participant.userId}:${participant.role}`, participant);
        }
        for (const participant of uniqueParticipants.values()) {
            await client.query(`
                INSERT INTO activity_participant (activity_event_id, user_id, participant_role)
                VALUES ($1, $2, $3)
                ON CONFLICT DO NOTHING
            `, [activity.activity_event_id, participant.userId, participant.role]);
        }
        await client.query('COMMIT');
        return activity;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function findCallContext(correlationIds) {
    const ids = correlationIds.filter(Boolean);
    if (!ids.length) return null;
    const result = await pool.query(`
        SELECT ae.*, COALESCE(
            JSON_AGG(JSON_BUILD_OBJECT('userId', ap.user_id, 'role', ap.participant_role))
                FILTER (WHERE ap.user_id IS NOT NULL), '[]'
        ) AS participants
        FROM activity_event ae
        LEFT JOIN activity_participant ap ON ap.activity_event_id = ae.activity_event_id
        WHERE ae.event_type = 'call' AND ae.correlation_id = ANY($1::text[])
        GROUP BY ae.activity_event_id
        ORDER BY ae.occurred_at ASC
        LIMIT 1
    `, [ids]);
    return result.rows[0] || null;
}

async function listActivities({ userId, role, condominiumId = null, limit = 30, before = null }) {
    const result = await pool.query(`
        SELECT ae.activity_event_id, ae.condominium_id, c.name AS condominium_name,
               ae.device_id, d.name AS device_name, ae.actor_user_id,
               actor.legal_name AS actor_name, ae.event_type, ae.status, ae.source,
               ae.correlation_id, ae.occurred_at, ae.metadata,
               COALESCE(
                   JSON_AGG(JSON_BUILD_OBJECT(
                       'user_id', ap.user_id,
                       'name', participant.legal_name,
                       'role', ap.participant_role
                   )) FILTER (WHERE ap.user_id IS NOT NULL), '[]'
               ) AS participants
        FROM activity_event ae
        INNER JOIN condominium c ON c.condominium_id = ae.condominium_id
        LEFT JOIN device d ON d.device_id = ae.device_id
        LEFT JOIN app_user actor ON actor.user_id = ae.actor_user_id
        LEFT JOIN activity_participant ap ON ap.activity_event_id = ae.activity_event_id
        LEFT JOIN app_user participant ON participant.user_id = ap.user_id
        WHERE ($3::uuid IS NULL OR ae.condominium_id = $3)
          AND ($4::timestamptz IS NULL OR ae.occurred_at < $4)
          AND (
              ae.event_type <> 'call'
              OR ae.correlation_id IS NULL
              OR NOT EXISTS (
                  SELECT 1 FROM activity_event newer
                  WHERE newer.event_type = 'call'
                    AND newer.source = ae.source
                    AND newer.correlation_id = ae.correlation_id
                    AND newer.created_at > ae.created_at
              )
          )
          AND (
              $2 = 'superadmin'
              OR ($2 = 'admin' AND c.admin_user_id = $1)
              OR ($2 = 'resident' AND (
                  ae.actor_user_id = $1 OR EXISTS (
                      SELECT 1 FROM activity_participant visible
                      WHERE visible.activity_event_id = ae.activity_event_id
                        AND visible.user_id = $1
                  )
              ))
          )
        GROUP BY ae.activity_event_id, c.name, d.name, actor.legal_name
        ORDER BY ae.occurred_at DESC, ae.activity_event_id DESC
        LIMIT $5
    `, [userId, role, condominiumId, before, limit]);
    return result.rows;
}

module.exports = { createActivity, findCallContext, listActivities };
