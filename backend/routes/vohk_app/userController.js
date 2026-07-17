const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authMiddleware');
const userService = require('../../services/vohk_app/userService');
router.use(authenticate);

router.get('/:condominiumId', async (req, res) => {
    try {
        const { userId, role } = req.user;
        const { condominiumId } = req.params;
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const users = await userService.getUsersByCondominium(userId, condominiumId);
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/units/:unitId/residents', async (req, res) => {
    try {
        const { userId, role } = req.user;
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const resident = await userService.createResident(req.params.unitId, userId, req.body);
        res.status(201).json(resident);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;