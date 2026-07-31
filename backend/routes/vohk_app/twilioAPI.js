const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const twilioService = require('../../services/vohk_app/twilioService');
const serviceAccount = require('../../firebase/firebase-service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

router.post('/incoming', async (req, res) => {
    try {
        console.log('Incoming call:', req.body);
        const from = req.body.From || '';
        const to = req.body.To || '';
        const twiml = await twilioService.handleIncomingCall(from, to);
        res.type('text/xml').send(twiml);
    } catch (err) {
        console.error('❌ Incoming call error:', err.message);
        if (err.message === 'Invalid SIP destination') {
            return res.status(400).send(err.message);
        }
        res.status(500).send('Internal server error');
    }
});
router.post('/outgoing', async (req, res) => {
    try {
        console.log('Outgoing call:', req.body);
        const from = req.body.From || '';
        const to = req.body.To || '';
        const twiml = await twilioService.handleOutgoingCall(from, to);
        return res.type('text/xml').status(200).send(twiml);
    } catch (error) {
        console.error('Outgoing call error:', error.message);
        if (error.message === 'Invalid client destination') {
            return res.status(400).send(error.message);
        }
        return res.status(500).send('Internal server error');
    }
});

module.exports = router;