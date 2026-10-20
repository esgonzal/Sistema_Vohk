const express = require('express');
const mediaAccessService = require('../../services/vohk_app/mediaAccessService');

const router = express.Router();

function deny(res) {
    return res.status(401).json({ error: 'Invalid or expired media token' });
}

router.get('/nginx-authorize', (req, res) => {
    const configuredSecret = process.env.MEDIA_AUTH_SHARED_SECRET;
    if (!configuredSecret || req.get('X-Media-Auth-Secret') !== configuredSecret) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const originalUri = req.get('X-Original-URI') || '';
    const parsed = new URL(originalUri, 'https://api.vohk.cl');
    const token = parsed.searchParams.get(mediaAccessService.MEDIA_TOKEN_QUERY_PARAM);
    return mediaAccessService.verifyMediaToken(token, parsed.pathname)
        ? res.sendStatus(204)
        : deny(res);
});

router.post('/mediamtx-authorize', (req, res) => {
    // MediaMTX calls this URL directly over loopback. Requests forwarded by
    // public Nginx contain X-Forwarded-For and must never reach this branch.
    if (req.get('X-Forwarded-For')) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const token = req.body?.token || mediaAccessService.tokenFromQueryString(req.body?.query);
    return mediaAccessService.verifyMediaToken(token, req.body?.path)
        ? res.sendStatus(204)
        : deny(res);
});

module.exports = router;
