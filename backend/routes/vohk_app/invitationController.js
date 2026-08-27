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
        if (!['admin', 'superadmin', 'resident', 'staff'].includes(role)) {
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

router.post('/', authenticate, upload.single('photo'), async (req, res) => {
    try {
        const { userId, role } = req.user;
        if (!['admin', 'superadmin', 'resident', 'staff'].includes(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const { unitId, residentUserId, type, validFrom, validUntil, durationHours, name, rut, email, phone, vehiclePlate } = req.body;
        const biometricConsent = req.body.biometricConsent === true || req.body.biometricConsent === 'true';
        let deviceIds = req.body.deviceIds;
        if (typeof deviceIds === 'string') {
            try {
                deviceIds = JSON.parse(deviceIds);
            } catch {
                deviceIds = [deviceIds];
            }
        }
        if (isBlank(unitId)) {
            return res.status(400).json({ error: 'Unit ID is required' });
        }
        if (isBlank(type)) {
            return res.status(400).json({ error: 'Invitation type is required' });
        }
        if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
            return res.status(400).json({ error: 'At least one intercom is required' });
        }
        if (type !== 'express' && isBlank(validFrom)) {
            return res.status(400).json({ error: 'Start date is required' });
        }
        if (type === 'temporary' && isBlank(validUntil)) {
            return res.status(400).json({ error: 'End date is required' });
        }
        if (type === 'express' && (durationHours === undefined || durationHours === null || String(durationHours).trim() === '')) {
            return res.status(400).json({ error: 'Express duration is required' });
        }
        if (type !== 'express' && (isBlank(name) || isBlank(rut))) {
            return res.status(400).json({ error: 'Visitor name and RUT are required' });
        }
        const invitation = await invitationService.createInvitation({
            userId,
            role,
            unitId,
            residentUserId: residentUserId || null,
            type,
            validFrom: validFrom || null,
            validUntil: validUntil || null,
            durationHours: durationHours || null,
            deviceIds,
            visitor: type === 'express' ? null : { name, rut, email, phone, vehiclePlate },
            photo: req.file || null,
            biometricConsent,
        });
        return res.status(201).json(invitation);
    } catch (error) {
        return sendServerError(res, error, 'Could not create invitation');
    }
});

router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { id } = req.params;
        if (!['admin', 'superadmin', 'resident', 'staff'].includes(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (isBlank(id)) {
            return res.status(400).json({ error: 'Invitation ID is required' });
        }
        const invitation = await invitationService.deleteInvitation({ invitationId: id, userId, role });
        if (!invitation) {
            return res.status(404).json({ error: 'Invitation not found' });
        }
        return res.status(200).json({ success: true, invitation });
    } catch (error) {
        return sendServerError(res, error, 'Could not revoke invitation');
    }
});

module.exports = router;
