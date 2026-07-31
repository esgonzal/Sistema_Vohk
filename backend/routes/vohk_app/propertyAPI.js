const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authMiddleware');
const propertyService = require('../../services/vohk_app/propertyService');
router.use(authenticate);

// UNIDADES
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


module.exports = router;