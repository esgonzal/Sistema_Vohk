const crypto = require('crypto');
const express = require('express');
const { createService } = require('../../services/vohk_app/almaService');

function safeEqual(left, right) {
    const leftBuffer = Buffer.from(String(left || ''));
    const rightBuffer = Buffer.from(String(right || ''));
    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createRouter(service = createService(), webhookSecret = process.env.ALMA_WEBHOOK_SECRET) {
    const router = express.Router();
    router.use((req, res, next) => {
        const authorization = req.get('authorization') || '';
        const suppliedSecret = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
        if (!webhookSecret || !safeEqual(suppliedSecret, webhookSecret)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
    });
    router.post('/residents/resolve', async (req, res) => {
        try {
            const result = await service.resolveResident(req.body?.name);
            res.set('Cache-Control', 'no-store').status(200).json(result);
        } catch (error) {
            const status = Number.isInteger(error.status) ? error.status : 500;
            if (status >= 500) console.error('Alma resident lookup failed:', error.message);
            res.status(status).json({ error: status >= 500 ? 'Resident lookup unavailable' : error.message });
        }
    });
    return router;
}

module.exports = createRouter();
module.exports.createRouter = createRouter;
