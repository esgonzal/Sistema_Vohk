const express = require('express');
const router = express.Router();
const userService = require('../../services/v0/userService');

router.post('/login', async (req, res) => {
    const { nombre, clave } = req.body;
    if (!nombre || !clave) {
        return res.status(400).json({ errmsg: 'Missing credentials', });
    }
    try {
        const data = await userService.login(nombre, clave);
        return res.json(data);
    } catch (error) {
        if (error.ttlockResponse) { return res.status(401).json(error.ttlockResponse); }
        console.error(error);
        return res.status(500).json({ errmsg: 'Error with TTLock API', });
    }
});

module.exports = router;