const pool = require('../database/db');

async function createVisitor(name, email, phone, vehiclePlate) {
    const result = await pool.query(
        `
        INSERT INTO visitor (
            name,
            email,
            phone,
            vehicle_plate
        )
        VALUES (
            $1,
            $2,
            $3,
            $4
        )
        RETURNING *
        `,
        [name, email, phone, vehiclePlate]
    );
    return result.rows[0];
}
async function deleteVisitor(visitorId) {
    await pool.query(
        `
        DELETE FROM visitor
        WHERE visitor_id = $1
        `,
        [visitorId]
    );
}

module.exports = { createVisitor, deleteVisitor };