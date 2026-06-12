const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const DEVICES_FILE = path.join(__dirname, '../../data/devices.json');
const serviceAccount = require('../../firebase/firebase-service-account.json');
const userRepository = require('../../repositories/userRepository');
const deviceRepository = require('../../repositories/deviceRepository');
const TWILIO_ACCOUNT_SID = 'AC86e880f4e6093cf6ced05ad83b7164ea';
const TWILIO_AUTH_TOKEN = '9485c1566561a77ed656ed2232b2aa31';
const TWILIO_API_KEY = 'SK11f6b290e65f792ccb606ba5bb750475';
const TWILIO_API_SECRET = 'Mq4m2iTGhfIKvFsBrIOmFrSjp035t9dH';
const TWILIO_TWIML_APP_SID = 'AP0384ba4ebbac7acffb89db57c7f841d4';

if (!admin.apps.length) { admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }) }

function loadDevices() {
    return JSON.parse(
        fs.readFileSync(DEVICES_FILE, 'utf8')
    );
}
router.post('/incoming', async (req, res) => {
    console.log('Incoming call:', req.body);
    const twiml = new twilio.twiml.VoiceResponse();
    const origen = req.body.From || '';
    const destino = req.body.To || '';
    if (origen.startsWith('sip:')) {
        const match = destino.match(/sip:(\d+)@/);
        if (!match) { return res.status(400).send('Invalid SIP destination'); }
        const apartmentIdentity = match[1];
        const resident = await userRepository.findByIdentity(apartmentIdentity);
        const intercom = await deviceRepository.findIntercomBySipAddress(origen);
        console.log('Intercom found:', intercom?.name);
        if (resident && resident.fcm_token) {
            try {
                await admin.messaging().send({
                    token: resident.fcm_token,
                    data: {
                        type: 'incoming_call',
                        identity: apartmentIdentity,
                        intercom: JSON.stringify(intercom),
                    },
                });
            } catch (err) {
                console.error('❌ Error sending FCM:', err);
            }
        } else {
            console.log('⚠️ Resident or FCM token not found');
        }
        const dial = twiml.dial();
        dial.client(apartmentIdentity);
    }
    else {
        const dial = twiml.dial({ callerId: '+16186212365' });
        dial.sip('sip:vp-01-vohk@vohk-porteria.sip.us1.twilio.com;transport=tcp');
    }
    res.type('text/xml');
    res.send(twiml.toString());
});
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) { return res.status(400).json({ error: 'Missing username or password' }); }
    const user = await userRepository.findByUsername(username);
    if (!user) { return res.status(401).json({ error: 'User not found' }); }
    if (user.password_hash !== password) { return res.status(401).json({ error: 'Invalid password' }); }
    const primaryUnit = await userRepository.fetchPrimaryUnit (user.user_id);
    res.json({ success: true, username: user.username, identity: user.identity, role: user.role, userId: user.user_id, primaryUnitId: primaryUnit?.unit_id ?? null });
});
router.post('/register-fcm', async (req, res) => {
    try {
        console.log(req.body);
        const { identity, fcmToken } = req.body;
        if (!identity || !fcmToken) { return res.status(400).json({ error: 'Missing identity or fcmToken' }); }
        const user = await userRepository.findByIdentity(identity);
        if (!user) { return res.status(404).json({ error: 'User identity not found' }); }
        await userRepository.updateFcmToken(identity, fcmToken);
        res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
router.get('/token', (req, res) => {
    const fcmToken = req.query.fcmToken;
    const identity = req.query.identity;
    if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_SECRET || !TWILIO_TWIML_APP_SID) { return res.status(500).json({ error: 'Variables de entorno de Twilio no configuradas' }); }
    const token = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, { identity: identity, ttl: 3600 });
    const voiceGrant = new VoiceGrant({ incomingAllow: true, outgoingApplicationSid: TWILIO_TWIML_APP_SID, pushCredentialSid: 'CRe04e9804aebdc00ea2a2bf7203b5069c', });
    token.addGrant(voiceGrant);
    res.json({ token: token.toJwt(), identity: identity });
});

module.exports = router;