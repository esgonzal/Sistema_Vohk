const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authMiddleware');
const propertyService = require('../../services/vohk_app/propertyService');
router.use(authenticate);

// CONDOMINIOS
router.get('/condominiums', async (req, res) => {
    try {
        const { tenantId } = req.user;
        res.json(await propertyService.listCondominiums(tenantId));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/condominiums', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { name, address, city } = req.body;
        const entity = await propertyService.createCondominium(tenantId, name, address, city);
        if (!entity) {
            return res.status(404).json({ error: 'Condominium not found' });
        }
        res.status(201).json(entity);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/condominiums/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { name, address, city } = req.body;
        const entity = await propertyService.updateCondominium(req.params.id, tenantId, name, address, city);
        if (!entity) {
            return res.status(404).json({ error: 'Condominium not found' });
        }
        res.json(entity);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.delete('/condominiums/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const entity = await propertyService.deleteCondominium(req.params.id, tenantId);
        if (!entity) {
            return res.status(404).json({ error: 'Condominium not found' });
        }
        res.json({ success: true, deleted: entity });
    } catch (err) {
        console.error(err);
        res.status(err.status || 500).json({ error: err.message });
    }
});
// ZONAS
router.get('/condominiums/:id/zones', async (req, res) => {
    try {
        const { tenantId } = req.user;
        res.json(await propertyService.listZones(req.params.id, tenantId));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/zones', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { condominiumId, name } = req.body;
        const entity = await propertyService.createZone(condominiumId, tenantId, name)
        if (!entity) {
            return res.status(404).json({ error: 'Zone not found' });
        }
        res.status(201).json(entity);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/zones/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { zoneId, name } = req.body;
        const entity = await propertyService.updateZone(zoneId, tenantId, name);
        if (!entity) {
            return res.status(404).json({ error: 'Zone not found' });
        }
        res.json(entity);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.delete('/zones/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const entity = await propertyService.deleteZone(req.params.id, tenantId);
        if (!entity) {
            return res.status(404).json({ error: 'Zone not found' });
        }
        res.json({ success: true, deleted: entity });
    } catch (err) {
        console.error(err);
        res.status(err.status || 500).json({ error: err.message });
    }
});
// TORRES
router.get('/condominiums/:id/buildings', async (req, res) => {
    try {
        const { tenantId } = req.user;
        res.json(await propertyService.listBuildings(req.params.id, tenantId));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/buildings', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { condominiumId, name, floorCount } = req.body;
        const entity = await propertyService.createBuilding(condominiumId, tenantId, name, floorCount);
        if (!entity) {
            return res.status(404).json({ error: 'Building not found' });
        }
        res.status(201).json(entity);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/buildings/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const entity = await propertyService.updateBuilding(req.params.id, tenantId, req.body.name, req.body.floorCount);
        if (!entity) {
            return res.status(404).json({ error: 'Building not found' });
        }
        res.json(entity);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.delete('/buildings/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const entity = await propertyService.deleteBuilding(req.params.id, tenantId);
        if (!entity) {
            return res.status(404).json({ error: 'Building not found' });
        }
        res.json({ success: true, deleted: entity });
    } catch (err) {
        console.error(err);
        res.status(err.status || 500).json({ error: err.message });
    }
});
// UNIDADES
router.get('/buildings/:id/units', async (req, res) => {
    try {
        const { tenantId } = req.user;
        res.json(await propertyService.listUnits(req.params.id, tenantId));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/units', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { buildingId, name, roomNo, floor } = req.body;
        const entity = await propertyService.createUnit(buildingId, tenantId, name, roomNo, floor);
        if (!entity) {
            return res.status(404).json({ error: 'Unit not found' });
        }
        res.status(201).json(entity);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/units/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { name, roomNo, floor } = req.body;
        const entity = await propertyService.updateUnit(req.params.id, tenantId, name, roomNo, floor);
        if (!entity) {
            return res.status(404).json({ error: 'Unit not found' });
        }
        res.json(entity);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.delete('/units/:id', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const entity = await propertyService.deleteUnit(req.params.id, tenantId);
        if (!entity) {
            return res.status(404).json({ error: 'Unit not found' });
        }
        res.json({ success: true, deleted: entity });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});
router.get('/resident/units', authenticate, async (req, res) => {
    try {
        const { userId } = req.user;
        const units = await propertyService.getResidentUnits(userId);
        res.json(units);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
// RESIDENTES
router.get('/units/:id/residents', async (req, res) => {
    try {
        const { tenantId } = req.user;
        res.json(await propertyService.listResidents(req.params.id, tenantId));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/units/:unitId/residents', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const resident = await propertyService.createResident(req.params.unitId, tenantId, req.body);
        res.status(201).json(resident);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/residents/:userId', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const updated = await propertyService.updateResident(req.params.userId, tenantId, req.body);
        if (!updated) { return res.status(404).json({ error: 'Resident not found' }); }
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.delete('/residents/:userId/units/:unitId', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const result = await propertyService.deleteResident(req.params.userId, tenantId, req.params.unitId);
        if (!result) { return res.status(404).json({ error: 'Resident not found' }); }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/residents/assign', async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { userId, unitId, isPrimary } = req.body;
        res.status(201).json(await propertyService.assignResidentToUnit(userId, unitId, isPrimary, tenantId));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/username', async (req, res) => {
    try {
        const { userId } = req.user;
        const { username } = req.body;
        const updated = await propertyService.updateUsername(userId, username);
        if (!updated) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.put('/email', async (req, res) => {
    try {
        const { userId } = req.user;
        const { email } = req.body;
        const updated = await propertyService.updateEmail(userId, email);
        if (!updated) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.put('/password', async (req, res) => {
    try {
        const { userId } = req.user;
        const { currentPassword, newPassword } = req.body;
        await propertyService.updatePassword(userId, currentPassword, newPassword,);
        res.json({ success: true, message: 'Password updated successfully', });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;