const express = require('express');
const router = express.Router();

const propertyRepository = require('../../repositories/propertyRepository');
const userRepository = require('../../repositories/userRepository');

// ── Condominiums ──────────────────────────────────────────────────────────────

router.get('/condominiums', async (req, res) => {
    try {
        const condominiums = await propertyRepository.findCondominiums();
        res.json(condominiums);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/condominiums', async (req, res) => {
    try {
        const { tenantId, name, address, city } = req.body;
        const condominium = await propertyRepository.createCondominium(tenantId, name, address, city);
        res.status(201).json(condominium);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/condominiums/:id', async (req, res) => {
    try {
        const { name, address, city } = req.body;
        const updated = await propertyRepository.updateCondominium(req.params.id, name, address, city);
        if (!updated) { return res.status(404).json({ error: 'Condominium not found' }); }
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.delete('/condominiums/:id', async (req, res) => {
    try {
        const condominium = await propertyRepository.deleteCondominium(req.params.id);
        if (!condominium) { return res.status(404).json({ error: 'Condominium not found' }); }
        res.json({ success: true, deleted: condominium });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Zones ─────────────────────────────────────────────────────────────────────

router.get('/condominiums/:id/zones', async (req, res) => {
    try {
        const zones = await propertyRepository.findZonesByCondominium(req.params.id);
        res.json(zones);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/zones', async (req, res) => {
    try {
        const { condominiumId, name } = req.body;
        const zone = await propertyRepository.createZone(condominiumId, name);
        res.status(201).json(zone);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/zones/:id', async (req, res) => {
    try {
        const zone = await propertyRepository.updateZone(req.params.id, req.body.name);
        if (!zone) { return res.status(404).json({ error: 'Zone not found' }); }
        res.json(zone);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.delete('/zones/:id', async (req, res) => {
    try {
        const zone = await propertyRepository.deleteZone(req.params.id);
        if (!zone) { return res.status(404).json({ error: 'Zone not found' }); }
        res.json({ success: true, deleted: zone });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Buildings ─────────────────────────────────────────────────────────────────

router.get('/condominiums/:id/buildings', async (req, res) => {
    try {
        const buildings = await propertyRepository.findBuildingsByCondominium(req.params.id);
        res.json(buildings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/buildings', async (req, res) => {
    try {
        const { condominiumId, name, floorCount } = req.body;
        const building = await propertyRepository.createBuilding(condominiumId, name, floorCount);
        res.status(201).json(building);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/buildings/:id', async (req, res) => {
    try {
        const building = await propertyRepository.updateBuilding(req.params.id, req.body.name, req.body.floorCount);
        if (!building) { return res.status(404).json({ error: 'Building not found' }); }
        res.json(building);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.delete('/buildings/:id', async (req, res) => {
    try {
        const building = await propertyRepository.deleteBuilding(req.params.id);
        if (!building) { return res.status(404).json({ error: 'Building not found' }); }
        res.json({ success: true, deleted: building });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Units ─────────────────────────────────────────────────────────────────────

router.get('/buildings/:id/units', async (req, res) => {
    try {
        const units = await propertyRepository.findUnitsByBuilding(req.params.id);
        res.json(units);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/units', async (req, res) => {
    try {
        const { buildingId, name, roomNo, floor } = req.body;
        const unit = await propertyRepository.createUnit(buildingId, name, roomNo, floor);
        res.status(201).json(unit);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/units/:id', async (req, res) => {
    try {
        const { name, roomNo, floor } = req.body;
        const unit = await propertyRepository.updateUnit(req.params.id, name, roomNo, floor);
        if (!unit) { return res.status(404).json({ error: 'Unit not found' }); }
        res.json(unit);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.delete('/units/:id', async (req, res) => {
    try {
        const unit = await propertyRepository.deleteUnit(req.params.id);
        if (!unit) { return res.status(404).json({ error: 'Unit not found' }); }
        res.json({ success: true, deleted: unit });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Residents ─────────────────────────────────────────────────────────────────

router.get('/units/:id/residents', async (req, res) => {
    try {
        const residents = await userRepository.findUsersByUnit(req.params.id);
        res.json(residents);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/units/:unitId/residents', async (req, res) => {
    try {
        const { unitId } = req.params;
        const { username, password, identity, email, legalName, isPrimary } = req.body;
        const resident = await userRepository.createResident(username, password, identity, email, legalName);
        await userRepository.assignResidentToUnit(resident.user_id, unitId, isPrimary ?? false);
        res.status(201).json(resident);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/residents/assign', async (req, res) => {
    try {
        const { userId, unitId, isPrimary } = req.body;
        const relation = await userRepository.assignResidentToUnit(userId, unitId, isPrimary);
        res.status(201).json(relation);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/residents/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { email, legalName, identity, active } = req.body;
        const updated = await userRepository.updateResident(userId, email, legalName, identity, active);
        if (!updated) { return res.status(404).json({ error: 'Resident not found' }); }
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.delete('/residents/:userId', async (req, res) => {
    try {
        const result = await userRepository.deleteResident(req.params.userId);
        if (!result) { return res.status(404).json({ error: 'Resident not found' }); }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;