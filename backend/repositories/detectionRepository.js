const pool = require('../database/db');

async function findDetections(limit = 100) {
    const result = await pool.query(
        `
        SELECT * FROM detection
        ORDER BY detected_at DESC
        LIMIT $1
        `,
        [limit]
    );
    return result.rows;
}
async function findDetectionsByDevice(deviceId, limit = 100) {
    const result = await pool.query(
        `
        SELECT * FROM detection
        WHERE device_id = $1
        ORDER BY detected_at DESC
        LIMIT $2
        `,
        [deviceId, limit]
    );
    return result.rows;
}
async function findDetectionById(detectionId) {
    const result = await pool.query(
        `SELECT * FROM detection WHERE detection_id = $1`,
        [detectionId]
    );
    return result.rows[0];
}
async function createDetection(deviceId, detectedClass, confidence, snapshotPath, detectedAt) {
    const result = await pool.query(
        `
        INSERT INTO detection (device_id, detected_class, confidence, snapshot_path, detected_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [deviceId, detectedClass, confidence, snapshotPath, detectedAt]
    );
    return result.rows[0];
}
async function deleteDetection(detectionId) {
    const result = await pool.query(
        `DELETE FROM detection WHERE detection_id = $1 RETURNING *`,
        [detectionId]
    );
    return result.rows[0];
}

module.exports = { findDetections, findDetectionsByDevice, findDetectionById, createDetection, deleteDetection };