const pool = require('../database/db');

async function getProfile(deviceId) {
    const [profileResult, regionsResult, rulesResult] = await Promise.all([
        pool.query(`
            SELECT device_id, scene_context, calibration_version, configuration_version,
                   reference_width, reference_height, reference_image_key, enabled,
                   created_at, updated_at, updated_by
            FROM camera_vision_profile
            WHERE device_id = $1
        `, [deviceId]),
        pool.query(`
            SELECT region_id, region_key, display_name, region_type, color, polygon,
                   description, enabled, created_at, updated_at
            FROM camera_vision_region
            WHERE device_id = $1
            ORDER BY created_at, region_id
        `, [deviceId]),
        pool.query(`
            SELECT rule_id, name, event_type, conditions, severity, schedule,
                   enabled, created_at, updated_at, updated_by
            FROM camera_vision_rule
            WHERE device_id = $1
            ORDER BY created_at, rule_id
        `, [deviceId]),
    ]);
    return {
        profile: profileResult.rows[0] || null,
        regions: regionsResult.rows,
        rules: rulesResult.rows,
    };
}

async function replaceProfile(deviceId, expectedVersion, profile, regions, rules, updatedBy) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const currentResult = await client.query(
            'SELECT configuration_version FROM camera_vision_profile WHERE device_id = $1 FOR UPDATE',
            [deviceId],
        );
        const currentVersion = currentResult.rows[0]?.configuration_version || 0;
        if (currentVersion !== expectedVersion) {
            const error = new Error('The vision profile was modified in another session');
            error.status = 409;
            error.code = 'VISION_PROFILE_VERSION_CONFLICT';
            error.details = { expectedVersion, currentVersion };
            throw error;
        }
        const nextVersion = currentVersion + 1;
        await client.query(`
            INSERT INTO camera_vision_profile (
                device_id, scene_context, calibration_version, configuration_version,
                reference_width, reference_height, reference_image_key, enabled, updated_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (device_id) DO UPDATE SET
                scene_context = EXCLUDED.scene_context,
                calibration_version = EXCLUDED.calibration_version,
                configuration_version = EXCLUDED.configuration_version,
                reference_width = EXCLUDED.reference_width,
                reference_height = EXCLUDED.reference_height,
                reference_image_key = EXCLUDED.reference_image_key,
                enabled = EXCLUDED.enabled,
                updated_at = NOW(),
                updated_by = EXCLUDED.updated_by
        `, [deviceId, profile.sceneContext, profile.calibrationVersion, nextVersion,
            profile.referenceWidth, profile.referenceHeight, profile.referenceImageKey,
            profile.enabled, updatedBy]);

        await client.query('DELETE FROM camera_vision_rule WHERE device_id = $1', [deviceId]);
        await client.query('DELETE FROM camera_vision_region WHERE device_id = $1', [deviceId]);

        for (const region of regions) {
            await client.query(`
                INSERT INTO camera_vision_region (
                    device_id, region_key, display_name, region_type, color,
                    polygon, description, enabled
                ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
            `, [deviceId, region.key, region.name, region.type, region.color,
                JSON.stringify(region.points), region.description, region.enabled]);
        }
        for (const rule of rules) {
            await client.query(`
                INSERT INTO camera_vision_rule (
                    device_id, name, event_type, conditions, severity, schedule,
                    enabled, updated_by
                ) VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb, $7, $8)
            `, [deviceId, rule.name, rule.eventType, JSON.stringify(rule.conditions),
                rule.severity, rule.schedule ? JSON.stringify(rule.schedule) : null,
                rule.enabled, updatedBy]);
        }
        await client.query('COMMIT');
        return nextVersion;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { getProfile, replaceProfile };
