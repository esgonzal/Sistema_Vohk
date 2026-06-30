const express = require('express');
const router = express.Router();
const propertyService = require('../../services/vohk_app/propertyService');

router.get('/condominiums', async (req, res) => {
    try {
        res.json(await propertyService.listCondominiums());
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/condominiums', async (req, res) => {
    try {
        const { tenantId, name, address, city } = req.body;
        res.status(201).json(await propertyService.createCondominium(tenantId, name, address, city));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/condominiums/:id', async (req, res) => {
    try {
        const { name, address, city } = req.body;
        const updated = await propertyService.updateCondominium(req.params.id, name, address, city);
        if (!updated) { return res.status(404).json({ error: 'Condominium not found' }); }
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.delete('/condominiums/:id', async (req, res) => {
    try {
        const deleted = await propertyService.deleteCondominium(req.params.id);
        if (!deleted) { return res.status(404).json({ error: 'Condominium not found' }); }
        res.json({ success: true, deleted });
    } catch (err) {
        console.error(err);
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/condominiums/:id/zones', async (req, res) => {
    try {
        res.json(await propertyService.listZones(req.params.id));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/zones', async (req, res) => {
    try {
        const { condominiumId, name } = req.body;
        res.status(201).json(await propertyService.createZone(condominiumId, name));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/zones/:id', async (req, res) => {
    try {
        const zone = await propertyService.updateZone(req.params.id, req.body.name);
        if (!zone) { return res.status(404).json({ error: 'Zone not found' }); }
        res.json(zone);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.delete('/zones/:id', async (req, res) => {
    try {
        const zone = await propertyService.deleteZone(req.params.id);
        if (!zone) { return res.status(404).json({ error: 'Zone not found' }); }
        res.json({ success: true, deleted: zone });
    } catch (err) {
        console.error(err);
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/condominiums/:id/buildings', async (req, res) => {
    try {
        res.json(await propertyService.listBuildings(req.params.id));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/buildings', async (req, res) => {
    try {
        const { condominiumId, name, floorCount } = req.body;
        res.status(201).json(await propertyService.createBuilding(condominiumId, name, floorCount));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/buildings/:id', async (req, res) => {
    try {
        const building = await propertyService.updateBuilding(req.params.id, req.body.name, req.body.floorCount);
        if (!building) { return res.status(404).json({ error: 'Building not found' }); }
        res.json(building);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.delete('/buildings/:id', async (req, res) => {
    try {
        const building = await propertyService.deleteBuilding(req.params.id);
        if (!building) { return res.status(404).json({ error: 'Building not found' }); }
        res.json({ success: true, deleted: building });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/buildings/:id/units', async (req, res) => {
    try {
        res.json(await propertyService.listUnits(req.params.id));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/units', async (req, res) => {
    try {
        const { buildingId, name, roomNo, floor } = req.body;
        res.status(201).json(await propertyService.createUnit(buildingId, name, roomNo, floor));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/units/:id', async (req, res) => {
    try {
        const { name, roomNo, floor } = req.body;
        const unit = await propertyService.updateUnit(req.params.id, name, roomNo, floor);
        if (!unit) { return res.status(404).json({ error: 'Unit not found' }); }
        res.json(unit);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.delete('/units/:id', async (req, res) => {
    try {
        const unit = await propertyService.deleteUnit(req.params.id);
        if (!unit) { return res.status(404).json({ error: 'Unit not found' }); }
        res.json({ success: true, deleted: unit });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/units/:id/residents', async (req, res) => {
    try {
        res.json(await propertyService.listResidents(req.params.id));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/units/:unitId/residents', async (req, res) => {
    try {
        const resident = await propertyService.createResident(req.params.unitId, req.body);
        res.status(201).json(resident);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/residents/:userId', async (req, res) => {
    try {
        const updated = await propertyService.updateResident(req.params.userId, req.body);
        if (!updated) { return res.status(404).json({ error: 'Resident not found' }); }
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.delete('/residents/:userId/units/:unitId', async (req, res) => {
    try {
        const result = await propertyService.deleteResident(req.params.userId, req.params.unitId);
        if (!result) { return res.status(404).json({ error: 'Resident not found' }); }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/residents/assign', async (req, res) => {
    try {
        const { userId, unitId, isPrimary } = req.body;
        res.status(201).json(await propertyService.assignResidentToUnit(userId, unitId, isPrimary));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;