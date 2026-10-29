const express = require('express');
const jwt = require('jsonwebtoken');
const visionEventService = require('../../services/vohk_app/visionEventService');
const cameraVisionService = require('../../services/vohk_app/cameraVisionService');
const router = express.Router();

function authenticateIngest(req, res, next) {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing ingestion token' });
    try {
        const token = jwt.verify(header.slice(7), process.env.JWT_SECRET, {
            issuer: 'vohk-api',
            audience: 'vohk-vision-ingest',
        });
        if (token.tokenType !== 'vision-ingest' || typeof token.deviceId !== 'string') {
            return res.status(403).json({ error: 'Invalid ingestion token' });
        }
        req.visionToken = token;
        return next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired ingestion token' });
    }
}

router.post('/', authenticateIngest, async (req, res) => {
    try {
        const event = await visionEventService.recordVisionEvent(req.visionToken, req.body);
        return res.status(201).json({ activityEventId: event.activity_event_id });
    } catch (error) {
        console.error('Could not record vision event:', error);
        const status = error.status >= 400 && error.status < 500 ? error.status : 500;
        return res.status(status).json({ error: status === 500 ? 'Could not record vision event' : error.message });
    }
});

router.get('/profile', authenticateIngest, async (req, res) => {
    try {
        const profile = await cameraVisionService.getVisionProfileForIngest(req.visionToken.deviceId);
        return res.status(200).json(profile);
    } catch (error) {
        console.error('Could not retrieve vision profile:', error);
        const status = error.status >= 400 && error.status < 500 ? error.status : 500;
        return res.status(status).json({ error: status === 500 ? 'Could not retrieve vision profile' : error.message });
    }
});

module.exports = router;
