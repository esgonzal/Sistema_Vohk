const express = require('express');
const router = express.Router();
const authService = require('../../services/vohk_app/authService');
const authenticate = require('../../middleware/authMiddleware');
const { createRateLimiter } = require('../../middleware/rateLimitMiddleware');

const loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    key: req => `${req.ip}:${req.body?.username || ''}`,
    message: 'Too many login attempts. Try again in 15 minutes.',
});
const forgotPasswordLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    key: req => req.ip,
    message: 'Too many password reset requests. Try again in 15 minutes.',
});
const resetPasswordLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    key: req => req.ip,
    message: 'Too many password reset attempts. Try again in 15 minutes.',
});

router.post('/login', loginLimiter, async (req, res) => {
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
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
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
router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ error: 'Missing token or password' });
        }
        const result = await authService.resetPassword(token, password);
        if (result.error) {
            return res.status(result.status).json({ error: result.error });
        }
        res.json({ ok: true, message: 'Password updated successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.get('/token', authenticate, (req, res) => {
    try {
        const { identity } = req.user;
        const { platform, environment } = req.query;
        console.log('Twilio token request:', { platform, environment, identity });
        if (platform && platform !== 'android' && platform !== 'ios') {
            return res.status(400).json({ error: 'platform must be android or ios' });
        }
        if (platform === 'ios' && environment !== 'sandbox' && environment !== 'production') {
            return res.status(400).json({ error: 'iOS environment must be sandbox or production' });
        }
        const token = authService.generateTwilioToken(identity, platform, environment);
        res.json({ token });
    } catch (err) {
        console.error('Unable to generate Twilio token:', err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/register-fcm', authenticate, async (req, res) => {
    try {
        const { userId } = req.user;
        const { fcmToken, platform, deviceName } = req.body;
        if (!fcmToken || !platform) {
            console.warn(`[FCM DEVICE REGISTRATION REJECTED] user=${userId} reason=missing-fields platform=${platform || 'missing'}`);
            return res.status(400).json({ error: 'fcmToken and platform are required' });
        }
        if (!['android', 'ios'].includes(platform)) {
            console.warn(`[FCM DEVICE REGISTRATION REJECTED] user=${userId} reason=invalid-platform platform=${platform}`);
            return res.status(400).json({ error: 'Invalid platform' });
        }
        const result = await authService.registerFcmToken(userId, { fcmToken, platform, deviceName });
        console.log(`[FCM DEVICE REGISTERED] user=${userId} platform=${platform}`);
        return res.status(200).json(result);
    } catch (err) {
        console.error(`[FCM DEVICE REGISTRATION FAILED] user=${req.user?.userId || 'unknown'}`, err);
        return res.status(500).json({ error: err.message });
    }
});
router.post('/register-fcm/failure', authenticate, async (req, res) => {
    const { userId } = req.user;
    const platform = String(req.body?.platform || 'unknown').slice(0, 20);
    const error = String(req.body?.error || 'No error supplied').replace(/[\r\n]+/g, ' ').slice(0, 500);
    console.warn(`[FCM CLIENT SETUP FAILED] user=${userId} platform=${platform} error=${error}`);
    return res.status(204).end();
});
router.delete('/register-fcm', authenticate, async (req, res) => {
    try {
        const { userId } = req.user;
        const { fcmToken } = req.body;
        if (!fcmToken) {
            return res.status(400).json({ error: 'Missing fcmToken' });
        }
        const result = await authService.unregisterFcmToken(userId, fcmToken);
        return res.status(200).json(result);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
