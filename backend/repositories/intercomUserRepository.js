const pool = require('../database/db');

// Find intercom users by its intercom_user_id
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
// Find all intercom_users of an intercom_id
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
// Find all intercom_users of an user_id
async function findIntercomUsersByUserId(userId) {
    const result = await pool.query(
        `
        SELECT *
        FROM intercom_user
        WHERE user_id = $1
        ORDER BY created_at
        `,
        [userId]
    );
    return result.rows;
}
// Find all intercom_users of an employeeNo
async function findIntercomUserByEmployeeNo(employeeNo) {
    const result = await pool.query(
        `
        SELECT *
        FROM intercom_user
        WHERE employee_no = $1
        `,
        [employeeNo]
    );
    return result.rows[0];
}
// Create an intercom_user for the intercom
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
// Update one intercom_users
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
// Delete an intercom_user
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
// Delete all intercom_users for an user
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
// Delete all intercom_users for an intercom
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

module.exports = {
    // Find rows
    findIntercomUserById, findIntercomUsersByIntercomId, findIntercomUsersByUserId, findIntercomUserByEmployeeNo,
    // Create
    createIntercomUser,
    // Update
    updateIntercomUser,
    // Delete
    deleteIntercomUser, deleteIntercomUsersByUserId, deleteIntercomUsersByIntercomId, deleteIntercomUserByUserAndIntercom
};