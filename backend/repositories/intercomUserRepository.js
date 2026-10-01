const pool = require('../database/db');

async function findIntercomUsersByUserAndCondominium(userId, condominiumId) {
    const result = await pool.query(
        `
        SELECT
            iu.*,
            d.device_id
        FROM intercom_user iu
        INNER JOIN intercom i ON i.intercom_id = iu.intercom_id
        INNER JOIN device d ON d.device_id = i.device_id
        INNER JOIN zone z ON z.zone_id = d.zone_id
        WHERE iu.user_id = $1 AND z.condominium_id = $2
        ORDER BY iu.created_at
        `,
        [userId, condominiumId]
    );
    return result.rows;
}
async function findIntercomUserByDeviceAndEmployeeNo(deviceId, employeeNo) {
    const result = await pool.query(
        `
        SELECT iu.*
        FROM intercom_user iu
        INNER JOIN intercom i ON i.intercom_id = iu.intercom_id
        WHERE i.device_id = $1 AND iu.employee_no = $2
        `,
        [deviceId, employeeNo]
    );
    return result.rows[0];
}
async function findIntercomUserByUserAndDevice(userId, deviceId) {
    const result = await pool.query(
        `
        SELECT iu.*
        FROM intercom_user iu
        INNER JOIN intercom i ON i.intercom_id = iu.intercom_id
        WHERE iu.user_id = $1 AND i.device_id = $2
        `,
        [userId, deviceId]
    );
    return result.rows[0];
}
async function findAccessMethods(userId) {
    const result = await pool.query(
        `
        SELECT
            iu.intercom_user_id,
            iu.intercom_id,
            iu.employee_no,
            iu.dynamic_code,
            iu.has_face,
            iu.face_updated_at,
            i.device_id
        FROM intercom_user iu
        INNER JOIN intercom i ON i.intercom_id = iu.intercom_id
        WHERE iu.user_id = $1
        ORDER BY iu.created_at
        `,
        [userId]
    );
    return result.rows;
}
async function findIntercomUsersWithDeviceByUserId(userId) {
    const result = await pool.query(
        `
        SELECT
            iu.*,
            i.device_id
        FROM intercom_user iu
        INNER JOIN intercom i ON i.intercom_id = iu.intercom_id
        WHERE iu.user_id = $1
        ORDER BY iu.created_at
        `,
        [userId]
    );
    return result.rows;
}
async function findCallableResidentsByDevice(deviceId) {
    const result = await pool.query(
        `
        SELECT DISTINCT
            au.user_id,
            au.legal_name,
            un.unit_id,
            un.room_no,
            b.name AS building_name
        FROM device d
        INNER JOIN zone z ON z.zone_id = d.zone_id
        INNER JOIN intercom i ON i.device_id = d.device_id
        INNER JOIN intercom_user iu ON iu.intercom_id = i.intercom_id
        INNER JOIN app_user au ON au.user_id = iu.user_id
        INNER JOIN resident_unit ru ON ru.user_id = au.user_id
        INNER JOIN unit un ON un.unit_id = ru.unit_id
        INNER JOIN building b ON b.building_id = un.building_id
        WHERE d.device_id = $1
          AND d.active = TRUE
          AND au.active = TRUE
          AND au.role = 'resident'
          AND b.condominium_id = z.condominium_id
        ORDER BY au.legal_name, b.name, un.room_no
        `,
        [deviceId]
    );
    return result.rows;
}
async function createIntercomUser(userId, intercomId, employeeNo, dynamic_code) {
    const result = await pool.query(
        `
        INSERT INTO intercom_user (
            user_id,
            intercom_id,
            employee_no,
            dynamic_code
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, intercom_id) DO NOTHING
        RETURNING *
        `,
        [userId, intercomId, employeeNo, dynamic_code]
    );
    return result.rows[0];
}
async function deleteIntercomUserByUserAndIntercom(userId, intercomId) {
    const result = await pool.query(
        `
        DELETE FROM intercom_user
        WHERE user_id = $1 AND intercom_id = $2
        RETURNING *
        `,
        [userId, intercomId]
    );
    return result.rows[0];
}
async function updateFaceStatus(intercomUserId, hasFace) {
    const result = await pool.query(
        `
        UPDATE intercom_user
        SET
            has_face = $2,
            face_updated_at = CASE WHEN $2 THEN NOW() ELSE NULL END
        WHERE intercom_user_id = $1
        RETURNING *
        `,
        [intercomUserId, hasFace]
    );
    return result.rows[0];
}
async function updateDynamicCode(intercomUserId, dynamicCode) {
    const result = await pool.query(
        `
        UPDATE intercom_user
        SET
            dynamic_code = $2
        WHERE intercom_user_id = $1
        RETURNING *
        `,
        [intercomUserId, dynamicCode]
    );
    return result.rows[0];
}

module.exports = {
    findIntercomUsersByUserAndCondominium, findIntercomUserByDeviceAndEmployeeNo, findIntercomUserByUserAndDevice, findAccessMethods, findIntercomUsersWithDeviceByUserId,
    findCallableResidentsByDevice, createIntercomUser, deleteIntercomUserByUserAndIntercom, updateFaceStatus, updateDynamicCode,
};
