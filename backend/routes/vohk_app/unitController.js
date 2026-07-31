const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const unitService = require('../../services/vohk_app/unitService');
const router = express.Router();
router.use(authenticate);

function isBlank(value) {
    return (typeof value !== 'string' || value.trim() === '');
}
function sendServerError(res, error, message) {
    console.error(error);
    if (error.status && error.status >= 400 && error.status < 500) {
        return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: message });
}

router.get('/tree/:condominiumId', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { condominiumId } = req.params;
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (isBlank(condominiumId)) {
            return res.status(400).json({ error: 'Condominium ID is required' });
        }
        const tree = await unitService.getUnitTree(condominiumId, userId);
        return res.status(200).json(tree);
    } catch (error) {
        return sendServerError(res, error, 'Could not retrieve unit tree');
    }
});
router.post('/', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { buildingId, name, roomNo, floor } = req.body;
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (isBlank(buildingId) || isBlank(name) || isBlank(roomNo)) {
            return res.status(400).json({ error: 'Building ID, name and room number are required' });
        }
        if (floor !== undefined && (!Number.isInteger(floor) || floor < 0)) {
            return res.status(400).json({ error: 'Floor must be a non-negative integer' });
        }
        const unit = await unitService.createUnit(buildingId, userId, name.trim(), roomNo.trim(), floor);
        return res.status(201).json(unit);
    } catch (error) {
        return sendServerError(res, error, 'Could not create unit');
    }
});
router.put('/:unitId', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { unitId } = req.params;
        const { name, roomNo, floor } = req.body;
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (isBlank(unitId) || isBlank(name) || isBlank(roomNo)) {
            return res.status(400).json({ error: 'Unit ID, name and room number are required' });
        }
        if (floor !== undefined && (!Number.isInteger(floor) || floor < 0)) {
            return res.status(400).json({ error: 'Floor must be a non-negative integer' });
        }
        const unit = await unitService.updateUnit(unitId, userId, name.trim(), roomNo.trim(), floor);
        return res.status(200).json(unit);
    } catch (error) {
        return sendServerError(res, error, 'Could not update unit');
    }
});
router.delete('/:unitId', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { unitId } = req.params;
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (isBlank(unitId)) {
            return res.status(400).json({ error: 'Unit ID is required' });
        }
        const unit = await unitService.deleteUnit(unitId, userId);
        return res.status(200).json({ success: true, deleted: unit });
    } catch (error) {
        return sendServerError(res, error, 'Could not delete unit');
    }
});

module.exports = router;