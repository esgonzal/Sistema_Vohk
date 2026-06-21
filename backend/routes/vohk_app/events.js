const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const pool = require("../../db"); // adjust if needed

const DETECTION_DIR = "/var/www/detections";

// ensure folder exists
if (!fs.existsSync(DETECTION_DIR)) {
    fs.mkdirSync(DETECTION_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, DETECTION_DIR);
    },
    filename: (req, file, cb) => {
        const safeName = `det_${Date.now()}.jpg`;
        cb(null, safeName);
    }
});

const upload = multer({ storage });

/**
 * POST /detections
 */
router.post("/", upload.single("snapshot"), async (req, res) => {
    try {
        const {
            deviceId,
            detectedClass,
            confidence,
            detectedAt
        } = req.body;

        const snapshotPath = req.file
            ? `/detections/${req.file.filename}`
            : null;

        await pool.query(
            `
            INSERT INTO detection (
                device_id,
                detected_class,
                confidence,
                snapshot_path,
                detected_at
            )
            VALUES ($1, $2, $3, $4, $5)
            `,
            [
                deviceId,
                detectedClass,
                parseFloat(confidence),
                snapshotPath,
                detectedAt
            ]
        );

        res.status(201).json({ success: true });

    } catch (err) {
        console.error("Detection insert error:", err);
        res.status(500).json({ success: false });
    }
});

/**
 * GET /detections
 */
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT *
            FROM detection
            ORDER BY detected_at DESC
            LIMIT 100
        `);

        res.json(result.rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

module.exports = router;