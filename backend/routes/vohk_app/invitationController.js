const express = require('express');
const multer = require('multer');
const authenticate = require('../../middleware/authMiddleware');
const invitationService = require('../../services/vohk_app/invitationService');
const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});
function isBlank(value) {
    return typeof value !== 'string' || value.trim() === '';
}
function sendServerError(res, error, message) {
    console.error(error);
    if (error.status && error.status >= 400 && error.status < 500) {
        return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: message });
}

router.get('/', authenticate, async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { unitId } = req.query;
        if (role !== 'admin' && role !== 'resident') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (isBlank(unitId)) {
            return res.status(400).json({ error: 'Unit ID is required' });
        }
        const invitations = await invitationService.listInvitations({ userId, role, unitId });
        return res.status(200).json(invitations);
    } catch (error) {
        return sendServerError(res, error, 'Could not retrieve invitations');
    }
});
router.post('/', authenticate, async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { unitId, validFrom, validUntil, type, deviceIds } = req.body;
        if (role !== 'admin' && role !== 'resident') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (isBlank(unitId) || isBlank(validFrom) || isBlank(validUntil)) {
            return res.status(400).json({ error: 'Unit ID, start date and end date are required' });
        }
        if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
            return res.status(400).json({ error: 'At least one intercom is required' });
        }
        const invitation = await invitationService.createInvitation({ userId, role, unitId, validFrom, validUntil, type, deviceIds });
        return res.status(201).json(invitation);
    } catch (error) {
        return sendServerError(res, error, 'Could not create invitation');
    }
});
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { id } = req.params;
        if (role !== 'admin' && role !== 'resident') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (isBlank(id)) {
            return res.status(400).json({ error: 'Invitation ID is required' });
        }
        const invitation = await invitationService.deleteInvitation({ invitationId: id, userId, role });
        if (!invitation) {
            return res.status(404).json({ error: 'Invitation not found' });
        }
        return res.status(200).json({ success: true, deleted: invitation });
    } catch (error) {
        return sendServerError(res, error, 'Could not delete invitation');
    }
});
router.get('/:id/public', async (req, res) => {
    try {
        const { id } = req.params;
        if (isBlank(id)) {
            return res.status(400).json({ error: 'Invitation ID is required' });
        }
        const invitation = await invitationService.getPublicInvitation(id);
        if (!invitation) {
            return res.status(404).json({ error: 'Invitation not found' });
        }
        return res.status(200).json(invitation);
    } catch (error) {
        return sendServerError(res, error, 'Could not retrieve invitation');
    }
});
router.post('/:id/register', upload.single('photo'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, vehiclePlate } = req.body;
        const { file: photo } = req;
        if (isBlank(id) || isBlank(name)) {
            return res.status(400).json({ error: 'Invitation ID and visitor name are required' });
        }
        const result = await invitationService.registerVisitor({ invitationId: id, visitor: { name: name.trim(), email, phone, vehiclePlate }, photo });
        return res.status(200).json({ success: true, dynamicCode: result.dynamicCode });
    } catch (error) {
        return sendServerError(res, error, 'Could not register visitor');
    }
});

module.exports = router;