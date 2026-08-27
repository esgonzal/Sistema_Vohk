const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const userService = require('../../services/vohk_app/userService');
const router = express.Router();
router.use(authenticate);

function isBlank(value) {
    return typeof value !== 'string' || value.trim() === '';
}
function isValidEmail(value) {
    return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
function sendServerError(res, error, message) {
    console.error(error);
    if (error.status && error.status >= 400 && error.status < 500) {
        return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: message });
}
function isAdminRole(role) {
    return role === 'admin' || role === 'superadmin';
}

router.put('/username', async (req, res) => {
    try {
        const { userId } = req.user;
        const { username } = req.body;
        if (isBlank(username)) {
            return res.status(400).json({ error: 'Username is required' });
        }
        const updated = await userService.updateUsername(userId, username.trim());
        if (!updated) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({ username: updated.username });
    } catch (error) {
        return sendServerError(res, error, 'Could not update username');
    }
});
router.put('/email', async (req, res) => {
    try {
        const { userId } = req.user;
        const { email } = req.body;
        if (isBlank(email)) {
            return res.status(400).json({ error: 'Email is required' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'A valid email is required' });
        }
        const updated = await userService.updateEmail(userId, email.trim());
        if (!updated) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({ email: updated.email });
    } catch (error) {
        return sendServerError(res, error, 'Could not update email');
    }
});
router.put('/password', async (req, res) => {
    try {
        const { userId } = req.user;
        const { currentPassword, newPassword } = req.body;
        if (isBlank(currentPassword) || isBlank(newPassword)) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }
        await userService.updatePassword(userId, currentPassword, newPassword);
        return res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        return sendServerError(res, error, 'Could not update password');
    }
});
router.post('/management', async (req, res) => {
    try {
        const { userId, role: creatorRole } = req.user;
        const { legalName, rut, email, role, condominiumId } = req.body;
        if (!isAdminRole(creatorRole)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (isBlank(legalName) || isBlank(rut) || isBlank(email) || isBlank(role)) {
            return res.status(400).json({ error: 'Legal name, RUT, email and role are required' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'A valid email is required' });
        }
        if (!['admin', 'staff'].includes(role)) {
            return res.status(400).json({ error: 'Role must be admin or staff' });
        }
        if (role === 'admin' && creatorRole !== 'superadmin') {
            return res.status(403).json({ error: 'Only superadmin can create administrators' });
        }
        if (role === 'staff' && isBlank(condominiumId)) {
            return res.status(400).json({ error: 'Condominium ID is required for staff' });
        }
        const user = await userService.createManagementUser(userId, creatorRole, {
            legalName: legalName.trim(),
            rut: rut.trim(),
            email: email.trim(),
            role,
            condominiumId: role === 'staff' ? condominiumId : null
        });
        return res.status(201).json(user);
    } catch (error) {
        return sendServerError(res, error, 'Could not create user');
    }
});
router.get('/:condominiumId', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { condominiumId } = req.params;
        if (!isAdminRole(role) && role !== 'staff') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (isBlank(condominiumId)) {
            return res.status(400).json({ error: 'Condominium ID is required' });
        }
        const users = await userService.getUsersByCondominium(userId, role, condominiumId);
        return res.status(200).json(users);
    } catch (error) {
        return sendServerError(res, error, 'Could not retrieve users');
    }
});
router.post('/:unitId', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { unitId } = req.params;
        const { legalName, rut, email, isPrimary } = req.body;
        if (!isAdminRole(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (isBlank(unitId) || isBlank(legalName) || isBlank(rut) || isBlank(email)) {
            return res.status(400).json({ error: 'Unit ID, legal name, RUT and email are required' });
        }
        if (isPrimary !== undefined && typeof isPrimary !== 'boolean') {
            return res.status(400).json({ error: 'isPrimary must be a boolean' });
        }
        const resident = await userService.createResident(unitId, userId, role, { legalName: legalName.trim(), rut: rut.trim(), email: email.trim(), isPrimary: isPrimary ?? false });
        return res.status(201).json(resident);
    } catch (error) {
        return sendServerError(res, error, 'Could not create resident');
    }
});
router.put('/:residentId', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { residentId } = req.params;
        const { unitId, legalName, email, isPrimary } = req.body;
        if (!isAdminRole(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (isBlank(residentId) || isBlank(unitId) || isBlank(legalName) || isBlank(email)) {
            return res.status(400).json({ error: 'Resident ID, unit ID, legal name and email are required' });
        }
        if (typeof isPrimary !== 'boolean') {
            return res.status(400).json({ error: 'isPrimary must be a boolean' });
        }
        const resident = await userService.updateResident(residentId, userId, role, { unitId, legalName: legalName.trim(), email: email.trim(), isPrimary });
        if (!resident) {
            return res.status(404).json({ error: 'Resident not found' });
        }
        return res.status(200).json(resident);
    } catch (error) {
        return sendServerError(res, error, 'Could not update resident');
    }
});
router.delete('/residents/:residentId/units/:unitId', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { residentId, unitId } = req.params;
        if (!isAdminRole(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const result = await userService.deleteResident(residentId, unitId, userId, role);
        if (!result) {
            return res.status(404).json({ error: 'Resident not found' });
        }
        return res.status(200).json({ success: true, ...result });
    } catch (error) {
        return sendServerError(res, error, 'Could not delete resident');
    }
});


module.exports = router;
