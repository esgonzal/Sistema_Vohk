const express = require('express');
const router = express.Router();
const authService = require('../../services/vohk_app/authService');
const authenticate = require('../../middleware/authMiddleware');

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Missing username or password' });
        }
        const result = await authService.login(username, password);
        if (result.error) {
            return res.status(result.status).json({ error: result.error });
        }
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                error: 'Missing email'
            });
        }
        await authService.forgotPassword(email);
        res.json({ ok: true, message: 'If an account exists for this email, password reset instructions have been sent.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({error: 'Missing token or password'});
        }
        const result = await authService.resetPassword(token, password);
        if (result.error) {
            return res.status(result.status).json({error: result.error});
        }
        res.json({ok: true,message: 'Password updated successfully.'});
    } catch (err) {
        console.error(err);
        res.status(500).json({error: err.message});
    }
});
router.get('/token', authenticate, (req, res) => {
    try {
        const { identity } = req.user;
        const token = authService.generateTwilioToken(identity);
        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/register-fcm', authenticate, async (req, res) => {
    try {
        const { userId } = req.user;
        const { fcmToken } = req.body;
        if (!fcmToken) {
            return res.status(400).json({ error: 'Missing fcmToken' });
        }
        const result = await authService.registerFcmToken(userId, fcmToken);
        if (result.error) {
            return res.status(result.status).json({ error: result.error });
        }
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;