const express = require('express');
const router = express.Router();
const authService = require('../../services/vohk_app/authService');

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Missing username or password' });
        }
        const result = await authService.login(username, password);
        if (result.error) { return res.status(result.status).json({ error: result.error }); }
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.get('/token', (req, res) => {
    try {
        const { identity } = req.query;
        if (!identity) { return res.status(400).json({ error: 'Missing identity' }); }
        const token = authService.generateTwilioToken(identity);
        res.json({ token, identity });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/register-fcm', async (req, res) => {
    try {
        const { identity, fcmToken } = req.body;
        if (!identity || !fcmToken) {
            return res.status(400).json({ error: 'Missing identity or fcmToken' });
        }
        const result = await authService.registerFcmToken(identity, fcmToken);
        if (result.error) { return res.status(result.status).json({ error: result.error }); }
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;