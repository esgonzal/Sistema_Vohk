const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authMiddleware');
const condominiumService = require('../../services/vohk_app/condominiumService');
router.use(authenticate);

router.get('/condominium-tree', async (req, res) => {
    try {
        const { userId, role } = req.user;
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const tree = await condominiumService.getCondominiumTree(userId);
        res.json(tree);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/create', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { name, address, city } = req.body;
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const entity = await condominiumService.createCondominium(userId, name, address, city);
        if (!entity) {
            return res.status(404).json({ error: 'Condominium not found' });
        }
        res.status(201).json(entity);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { name, address, city } = req.body;
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const entity = await condominiumService.updateCondominium(req.params.id, userId, name, address, city);
        if (!entity) {
            return res.status(404).json({ error: 'Condominium not found' });
        }
        res.json(entity);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { userId, role } = req.user;
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const entity = await condominiumService.deleteCondominium(req.params.id, userId);
        if (!entity) {
            return res.status(404).json({ error: 'Condominium not found' });
        }
        res.json({ success: true, deleted: entity });
    } catch (err) {
        console.error(err);
        res.status(err.status || 500).json({ error: err.message });
    }
});
router.post('/create-building', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { condominiumId, name, floorCount } = req.body;
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const entity = await condominiumService.createBuilding(condominiumId, userId, name, floorCount);
        if (!entity) {
            return res.status(404).json({ error: 'Building not found' });
        }
        res.status(201).json(entity);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/edit-building/:id', async (req, res) => {
    try {
        const { userId, role } = req.user;
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const entity = await condominiumService.updateBuilding(req.params.id, req.body.name, req.body.floorCount);
        if (!entity) {
            return res.status(404).json({ error: 'Building not found' });
        }
        res.json(entity);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.delete('/delete-building/:id', async (req, res) => {
    try {
        const { role } = req.user;
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const entity = await condominiumService.deleteBuilding(req.params.id);
        if (!entity) {
            return res.status(404).json({ error: 'Building not found' });
        }
        res.json({ success: true, deleted: entity });
    } catch (err) {
        console.error(err);
        res.status(err.status || 500).json({ error: err.message });
    }
});
router.post('/create-zone/:id', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { name } = req.body;
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const entity = await condominiumService.createZone(req.params.id, name)
        if (!entity) {
            return res.status(404).json({ error: 'Zone not found' });
        }
        res.status(201).json(entity);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.put('/edit-zone/:id', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { name } = req.body;
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const entity = await condominiumService.updateZone(req.params.id, name);
        if (!entity) {
            return res.status(404).json({ error: 'Zone not found' });
        }
        res.json(entity);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.delete('/delete-zone/:id', async (req, res) => {
    try {
        const { userId, role } = req.user;
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const entity = await condominiumService.deleteZone(req.params.id);
        if (!entity) {
            return res.status(404).json({ error: 'Zone not found' });
        }
        res.json({ success: true, deleted: entity });
    } catch (err) {
        console.error(err);
        res.status(err.status || 500).json({ error: err.message });
    }
});


module.exports = router;