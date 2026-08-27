const pool = require('../database/db');

async function createVisitor(name, rut, email, phone, vehiclePlate) {
    const result = await pool.query(
        `
        INSERT INTO visitor (name,rut,email,phone,vehicle_plate)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [name, rut, email, phone, vehiclePlate]
    );
    return result.rows[0];
}

async function deleteVisitor(visitorId) {
    const result = await pool.query(
        `
        DELETE FROM visitor
        WHERE visitor_id = $1
        RETURNING *
        `,
        [visitorId]
    );
    return result.rows[0];
}

module.exports = { createVisitor, deleteVisitor, };