const pool = require('../database/db');

async function findIntercomUserById(intercomUserId) {
    const result = await pool.query(
        `
        SELECT *
        FROM intercom_user
        WHERE intercom_user_id = $1
        `,
        [intercomUserId]
    );
    return result.rows[0];
}
async function findIntercomUsersByIntercomId(intercomId) {
    const result = await pool.query(
        `
        SELECT *
        FROM intercom_user
        WHERE intercom_id = $1
        ORDER BY created_at
        `,
        [intercomId]
    );
    return result.rows;
}
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
async function updateIntercomUser(intercomUserId, { employeeNo, dynamicCode }) {
    const result = await pool.query(
        `
        UPDATE intercom_user
        SET
            employee_no = $2,
            dynamic_code = $3
        WHERE intercom_user_id = $1
        RETURNING *
        `,
        [intercomUserId, employeeNo, dynamicCode]
    );
    return result.rows[0];
}
async function deleteIntercomUser(intercomUserId) {
    const result = await pool.query(
        `
        DELETE FROM intercom_user
        WHERE intercom_user_id = $1
        RETURNING *
        `,
        [intercomUserId]
    );
    return result.rows[0];
}
async function deleteIntercomUsersByUserId(userId) {
    const result = await pool.query(
        `
        DELETE FROM intercom_user
        WHERE user_id = $1
        RETURNING *
        `,
        [userId]
    );
    return result.rows;
}
async function deleteIntercomUsersByIntercomId(intercomId) {
    const result = await pool.query(
        `
        DELETE FROM intercom_user
        WHERE intercom_id = $1
        RETURNING *
        `,
        [intercomId]
    );
    return result.rows;
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

module.exports = {
    // Find rows
    findIntercomUserById, findIntercomUsersByIntercomId, findIntercomUsersByUserAndCondominium, findIntercomUserByDeviceAndEmployeeNo, findAccessMethods,
    // Create
    createIntercomUser,
    // Update
    updateIntercomUser,
    // Delete
    deleteIntercomUser, deleteIntercomUsersByUserId, deleteIntercomUsersByIntercomId, deleteIntercomUserByUserAndIntercom, updateFaceStatus, updateDynamicCode,
    findIntercomUsersWithDeviceByUserId
};