const express = require('express');
const multer = require('multer');
const fs = require('fs');
const router = express.Router();

const detectionRepository = require('../../repositories/detectionRepository');
const DETECTION_DIR = '/var/www/detections';
if (!fs.existsSync(DETECTION_DIR)) { fs.mkdirSync(DETECTION_DIR, { recursive: true }); }

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, DETECTION_DIR); },
    filename: (req, file, cb) => { cb(null, `det_${Date.now()}.jpg`); },
});
const upload = multer({ storage });

router.post('/', upload.single('snapshot'), async (req, res) => {
    try {
        const { deviceId, detectedClass, confidence, detectedAt } = req.body;
        const snapshotPath = req.file ? `/detections/${req.file.filename}` : null;
        await detectionRepository.createDetection(
            deviceId, detectedClass, parseFloat(confidence), snapshotPath, detectedAt
        );
        res.status(201).json({ success: true });
    } catch (err) {
        console.error('Detection insert error:', err);
        res.status(500).json({ success: false });
    }
});
router.get('/', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 100;
        const deviceId = req.query.deviceId;
        const detections = deviceId
            ? await detectionRepository.findDetectionsByDevice(deviceId, limit)
            : await detectionRepository.findDetections(limit);
        res.json(detections);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

module.exports = router;