const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const condominiumService = require('../../services/vohk_app/condominiumService');
const router = express.Router();
router.use(authenticate);

function isBlank(value) {
    return typeof value !== 'string' || value.trim() === '';
}
function isValidFloorCount(value) {
    return (typeof value === 'number' && Number.isInteger(value) && value > 0);
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
function parseShift(body) {
    const { name, startTime, endTime, weekdays, enabled, staffUserIds } = body;
    const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if (isBlank(name) || name.trim().length > 100) {
        const error = new Error('Shift name is required and must not exceed 100 characters');
        error.status = 400;
        throw error;
    }
    if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
        const error = new Error('startTime and endTime must use HH:mm format');
        error.status = 400;
        throw error;
    }
    const normalizedDays = Array.isArray(weekdays)
        ? [...new Set(weekdays)].sort((a, b) => a - b)
        : [];
    if (!normalizedDays.length || normalizedDays.some(day => !Number.isInteger(day) || day < 0 || day > 6)) {
        const error = new Error('weekdays must contain values from 0 to 6');
        error.status = 400;
        throw error;
    }
    const normalizedStaff = Array.isArray(staffUserIds) ? [...new Set(staffUserIds)] : [];
    if (normalizedStaff.some(id => typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
        const error = new Error('staffUserIds must contain valid user identifiers');
        error.status = 400;
        throw error;
    }
    if (typeof enabled !== 'boolean') {
        const error = new Error('enabled must be a boolean');
        error.status = 400;
        throw error;
    }
    return { name: name.trim(), startTime, endTime, weekdays: normalizedDays, enabled, staffUserIds: normalizedStaff };
}

router.get('/tree', async (req, res) => {
    try {
        const { userId, role } = req.user;
        if (!isAdminRole(role) && role !== 'staff') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const tree = await condominiumService.getCondominiumTree(userId, role);
        return res.status(200).json(tree);
    } catch (error) {
        return sendServerError(res, error, 'Could not retrieve condominium tree');
    }
});
router.get('/mobile', async (req, res) => {
    try {
        const { userId, role } = req.user;
        if (!isAdminRole(role) && role !== 'staff') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const condominiums = await condominiumService.listAdminCondominiums(userId, role);
        return res.status(200).json(condominiums);
    } catch (error) {
        return sendServerError(res, error, 'Could not retrieve condominiums');
    }
});
router.post('/', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { name, address, city } = req.body;
        if (!isAdminRole(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (isBlank(name) || isBlank(address) || isBlank(city)) {
            return res.status(400).json({ error: 'Name, address and city are required' });
        }
        const condominium = await condominiumService.createCondominium(userId, role, name.trim(), address.trim(), city.trim());
        if (!condominium) {
            return res.status(500).json({ error: 'Could not create condominium' });
        }
        return res.status(201).json(condominium);
    } catch (error) {
        return sendServerError(res, error, 'Could not create condominium');
    }
});
router.put('/:condominiumId', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { condominiumId } = req.params;
        const { name, address, city } = req.body;
        if (!isAdminRole(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (isBlank(name) || isBlank(address) || isBlank(city)) {
            return res.status(400).json({ error: 'Name, address and city are required' });
        }
        const condominium = await condominiumService.updateCondominium(condominiumId, userId, role, name.trim(), address.trim(), city.trim());
        if (!condominium) {
            return res.status(404).json({ error: 'Condominium not found' });
        }
        return res.status(200).json(condominium);
    } catch (error) {
        return sendServerError(res, error, 'Could not update condominium');
    }
});
router.delete('/:condominiumId', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { condominiumId } = req.params;
        if (!isAdminRole(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const condominium = await condominiumService.deleteCondominium(condominiumId, userId, role);
        if (!condominium) {
            return res.status(404).json({ error: 'Condominium not found' });
        }
        return res.status(200).json({ success: true, deleted: condominium });
    } catch (error) {
        return sendServerError(res, error, 'Could not delete condominium');
    }
});
router.put('/:condominiumId/resident-camera-access', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { condominiumId } = req.params;
        const { enabled } = req.body;
        if (!isAdminRole(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ error: 'enabled must be a boolean' });
        }
        const condominium = await condominiumService.updateResidentCameraAccess(condominiumId, userId, role, enabled);
        if (!condominium) {
            return res.status(404).json({ error: 'Condominium not found' });
        }
        return res.status(200).json(condominium);
    } catch (error) {
        return sendServerError(res, error, 'Could not update camera access');
    }
});
router.get('/:condominiumId/invitation-settings', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { condominiumId } = req.params;
        if (!isAdminRole(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const settings = await condominiumService.getInvitationSettings(condominiumId, userId, role);
        if (!settings) {
            return res.status(404).json({ error: 'Condominium not found' });
        }
        return res.status(200).json(settings);
    } catch (error) {
        return sendServerError(res, error, 'Could not retrieve invitation settings');
    }
});
router.put('/:condominiumId/invitation-settings', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { condominiumId } = req.params;
        const { maxRecurrentInvitations, maxTemporaryDurationHours, maxExpressDurationHours } = req.body;
        if (!isAdminRole(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (!Number.isInteger(maxRecurrentInvitations) || maxRecurrentInvitations < 0) {
            return res.status(400).json({ error: 'maxRecurrentInvitations must be a non-negative integer' });
        }
        if (!Number.isInteger(maxTemporaryDurationHours) || maxTemporaryDurationHours <= 0) {
            return res.status(400).json({ error: 'maxTemporaryDurationHours must be a positive integer' });
        }
        if (!Number.isInteger(maxExpressDurationHours) || maxExpressDurationHours <= 0) {
            return res.status(400).json({ error: 'maxExpressDurationHours must be a positive integer' });
        }
        const settings = await condominiumService.updateInvitationSettings(condominiumId,userId,role,maxRecurrentInvitations,maxTemporaryDurationHours,maxExpressDurationHours);
        if (!settings) {
            return res.status(404).json({ error: 'Condominium not found' });
        }
        return res.status(200).json(settings);
    } catch (error) {
        return sendServerError(res, error, 'Could not update invitation settings');
    }
});
router.get('/:condominiumId/staff-shifts', async (req, res) => {
    try {
        const { userId, role } = req.user;
        if (!isAdminRole(role)) return res.status(403).json({ error: 'Forbidden' });
        const data = await condominiumService.getStaffScheduleData(req.params.condominiumId, userId, role);
        return res.status(200).json(data);
    } catch (error) {
        return sendServerError(res, error, 'Could not retrieve staff shifts');
    }
});
router.post('/:condominiumId/staff-shifts', async (req, res) => {
    try {
        const { userId, role } = req.user;
        if (!isAdminRole(role)) return res.status(403).json({ error: 'Forbidden' });
        const shift = await condominiumService.createStaffShift(
            req.params.condominiumId, userId, role, parseShift(req.body)
        );
        return res.status(201).json(shift);
    } catch (error) {
        return sendServerError(res, error, 'Could not create staff shift');
    }
});
router.put('/staff-shifts/:shiftId', async (req, res) => {
    try {
        const { userId, role } = req.user;
        if (!isAdminRole(role)) return res.status(403).json({ error: 'Forbidden' });
        const shift = await condominiumService.updateStaffShift(req.params.shiftId, userId, role, parseShift(req.body));
        if (!shift) return res.status(404).json({ error: 'Shift not found' });
        return res.status(200).json(shift);
    } catch (error) {
        return sendServerError(res, error, 'Could not update staff shift');
    }
});
router.delete('/staff-shifts/:shiftId', async (req, res) => {
    try {
        const { userId, role } = req.user;
        if (!isAdminRole(role)) return res.status(403).json({ error: 'Forbidden' });
        const shift = await condominiumService.deleteStaffShift(req.params.shiftId, userId, role);
        if (!shift) return res.status(404).json({ error: 'Shift not found' });
        return res.status(200).json({ success: true, deleted: shift });
    } catch (error) {
        return sendServerError(res, error, 'Could not delete staff shift');
    }
});
router.post('/:condominiumId/buildings', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { condominiumId } = req.params;
        const { name, floorCount } = req.body;
        if (!isAdminRole(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (isBlank(name)) {
            return res.status(400).json({ error: 'Building name is required' });
        }
        if (!isValidFloorCount(floorCount)) {
            return res.status(400).json({ error: 'Floor count must be a positive integer' });
        }
        const building = await condominiumService.createBuilding(condominiumId, userId, role, name.trim(), floorCount);
        if (!building) {
            return res.status(404).json({ error: 'Condominium not found' });
        }
        return res.status(201).json(building);
    } catch (error) {
        return sendServerError(res, error, 'Could not create building');
    }
});
router.put('/buildings/:buildingId', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { buildingId } = req.params;
        const { name, floorCount } = req.body;
        if (!isAdminRole(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (isBlank(name)) {
            return res.status(400).json({ error: 'Building name is required' });
        }
        if (!isValidFloorCount(floorCount)) {
            return res.status(400).json({ error: 'Floor count must be a positive integer' });
        }
        const building = await condominiumService.updateBuilding(buildingId, userId, role, name.trim(), floorCount);
        if (!building) {
            return res.status(404).json({ error: 'Building not found' });
        }
        return res.status(200).json(building);
    } catch (error) {
        return sendServerError(res, error, 'Could not update building');
    }
});
router.delete('/buildings/:buildingId', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { buildingId } = req.params;
        if (!isAdminRole(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const building = await condominiumService.deleteBuilding(buildingId, userId, role);
        if (!building) {
            return res.status(404).json({ error: 'Building not found' });
        }
        return res.status(200).json({ success: true, deleted: building });
    } catch (error) {
        return sendServerError(res, error, 'Could not delete building');
    }
});
router.post('/:condominiumId/zones', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { condominiumId } = req.params;
        const { name } = req.body;
        if (!isAdminRole(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (isBlank(name)) {
            return res.status(400).json({ error: 'Zone name is required' });
        }
        const zone = await condominiumService.createZone(condominiumId, userId, role, name.trim());
        if (!zone) {
            return res.status(404).json({ error: 'Condominium not found' });
        }
        return res.status(201).json(zone);
    } catch (error) {
        return sendServerError(res, error, 'Could not create zone');
    }
});
router.put('/zones/:zoneId', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { zoneId } = req.params;
        const { name } = req.body;
        if (!isAdminRole(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (isBlank(name)) {
            return res.status(400).json({ error: 'Zone name is required' });
        }
        const zone = await condominiumService.updateZone(zoneId, userId, role, name.trim());
        if (!zone) {
            return res.status(404).json({ error: 'Zone not found' });
        }
        return res.status(200).json(zone);
    } catch (error) {
        return sendServerError(res, error, 'Could not update zone');
    }
});
router.delete('/zones/:zoneId', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { zoneId } = req.params;
        if (!isAdminRole(role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const zone = await condominiumService.deleteZone(zoneId, userId, role);
        if (!zone) {
            return res.status(404).json({ error: 'Zone not found' });
        }
        return res.status(200).json({ success: true, deleted: zone });
    } catch (error) {
        return sendServerError(res, error, 'Could not delete zone');
    }
});

module.exports = router;
