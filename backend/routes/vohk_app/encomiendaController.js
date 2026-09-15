const express = require('express');
const multer = require('multer');
const authenticate = require('../../middleware/authMiddleware');
const encomiendaService = require('../../services/vohk_app/encomiendaService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function isBlank(value) {
    return typeof value !== 'string' || value.trim() === '';
}

function sendError(res, error, fallback) {
    console.error(error);
    if (error.status >= 400 && error.status < 500) return res.status(error.status).json({ error: error.message });
    return res.status(500).json({ error: fallback });
}

router.get('/', authenticate, async (req, res) => {
    try {
        if (isBlank(req.query.unitId)) return res.status(400).json({ error: 'Unit ID is required' });
        const result = await encomiendaService.listEncomiendas({
            ...req.user,
            unitId: req.query.unitId,
            includeHistory: req.query.includeHistory === 'true',
        });
        return res.json(result);
    } catch (error) {
        return sendError(res, error, 'Could not retrieve packages');
    }
});

router.post('/', authenticate, upload.single('photo'), async (req, res) => {
    try {
        if (isBlank(req.body.unitId)) return res.status(400).json({ error: 'Unit ID is required' });
        const result = await encomiendaService.createEncomienda({
            ...req.user,
            unitId: req.body.unitId,
            recipientName: req.body.recipientName,
            courierName: req.body.courierName,
            notes: req.body.notes,
            photo: req.file,
        });
        return res.status(201).json(result);
    } catch (error) {
        return sendError(res, error, 'Could not register package');
    }
});

router.post('/deliver', authenticate, async (req, res) => {
    try {
        if (isBlank(req.body.claimToken)) return res.status(400).json({ error: 'Claim token is required' });
        const result = await encomiendaService.deliverEncomienda({ ...req.user, claimToken: req.body.claimToken });
        return res.json(result);
    } catch (error) {
        return sendError(res, error, 'Could not deliver package');
    }
});

router.get('/:id/photo', authenticate, async (req, res) => {
    try {
        const photo = await encomiendaService.getPhoto({ ...req.user, encomiendaId: req.params.id });
        res.set('Content-Type', photo.photo_mime_type);
        res.set('Cache-Control', 'private, max-age=300');
        return res.send(photo.photo_bytes);
    } catch (error) {
        return sendError(res, error, 'Could not retrieve package photo');
    }
});

router.post('/:id/cancel', authenticate, async (req, res) => {
    try {
        const result = await encomiendaService.cancelEncomienda({
            ...req.user,
            encomiendaId: req.params.id,
            reason: req.body.reason,
        });
        return res.json(result);
    } catch (error) {
        return sendError(res, error, 'Could not cancel package');
    }
});

module.exports = router;
