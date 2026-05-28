const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

const USERS_FILE = path.join(__dirname, '../data/vohk_users.json');
const serviceAccount = require('../firebase/firebase-service-account.json');

if (!admin.apps.length) { admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }) }

function loadUsers() {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('❌ Error loading users file:', err);
        return {};
    }
}
function saveUsers(users) {
    try {
        fs.writeFileSync(
            USERS_FILE,
            JSON.stringify(users, null, 4)
        );
    } catch (err) {
        console.error('❌ Error saving users file:', err);
    }
}

const TWILIO_ACCOUNT_SID = 'AC86e880f4e6093cf6ced05ad83b7164ea';
const TWILIO_AUTH_TOKEN = '9485c1566561a77ed656ed2232b2aa31';
const TWILIO_API_KEY = 'SK11f6b290e65f792ccb606ba5bb750475';
const TWILIO_API_SECRET = 'Mq4m2iTGhfIKvFsBrIOmFrSjp035t9dH';
const TWILIO_TWIML_APP_SID = 'AP0384ba4ebbac7acffb89db57c7f841d4';
const DEVICES = {
    main: {
        name: 'Entrada Principal',
        ip: '201.186.166.84',
        port: '8015',
        sip: 'sip:vp-01-vohk@vohk-porteria.sip.us1.twilio.com;transport=tcp',
        snapshot: 'https://api.vohk.cl/snapshots/cam5.jpg',
        streamUrl: 'https://api.vohk.cl/cam5',
        user: 'admin',
        pass: 'vohk2024',
        doorId: 1,
    },
    secondary: {
        name: 'Entrada Secundaria',
        ip: '201.186.166.84',
        port: '8014',
        sip: 'sip:vp-02-vohk@vohk-porteria.sip.us1.twilio.com;transport=tcp', //Doesnt exist yet, only vp-01 is registered in twilio
        snapshot: 'https://api.vohk.cl/snapshots/cam4.jpg',
        streamUrl: 'https://api.vohk.cl/cam4',
        user: 'admin',
        pass: 'vohk2024',
        doorId: 1,
    },
};

router.post('/incoming', async (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    const origen = req.body.From || '';
    const destino = req.body.To || '';
    if (origen.startsWith('sip:')) {
        const match = destino.match(/sip:(\d+)@/);
        if (!match) {return res.status(400).send('Invalid SIP destination');}
        const apartmentIdentity = match[1];
        const users = loadUsers();
        const resident = Object.values(users).find(u => u.identity === apartmentIdentity);
        const streamUrl = DEVICES.main.streamUrl; 
        if (resident && resident.fcmToken) {
            console.log(`📲 Sending FCM push to ${apartmentIdentity}`);
            try {
                await admin.messaging().send({
                    token: resident.fcmToken,
                    data: {
                        type: 'incoming_call',
                        identity: apartmentIdentity,
                        streamUrl: streamUrl, 
                    },
                });
                console.log('✅ FCM push sent');
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
router.post('/outgoing', async (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    const identity = req.body.identity; // e.g. "intercom_main"
    let sipAddress = null;
    if (identity === 'intercom_main') {
        sipAddress = 'sip:vp-01-vohk@vohk-porteria.sip.us1.twilio.com;transport=tcp';
    }
    if (!sipAddress) {
        return res.status(400).send('Unknown destination');
    }
    const dial = twiml.dial();
    dial.sip(sipAddress);
    res.type('text/xml');
    res.send(twiml.toString());
});
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) { return res.status(400).json({ error: 'Missing username or password' }); }
    const users = loadUsers();
    const user = users[username];
    if (!user) { return res.status(401).json({ error: 'User not found' }); }
    if (user.password !== password) { return res.status(401).json({ error: 'Invalid password' }); }
    res.json({ success: true, username: username, identity: user.identity, });
});
router.post('/register-fcm', (req, res) => {
    const { identity, fcmToken } = req.body;
    if (!identity || !fcmToken) { return res.status(400).json({ error: 'Missing identity or fcmToken' }); }
    const users = loadUsers();
    let found = false;
    for (const username in users) {
        if (users[username].identity === identity) {
            users[username].fcmToken = fcmToken;
            found = true;
            break;
        }
    }
    if (!found) { return res.status(404).json({ error: 'User identity not found' }); }
    saveUsers(users);
    res.json({ success: true });
});
router.get('/token', (req, res) => {
    const accountSid = TWILIO_ACCOUNT_SID;
    const apiKey = TWILIO_API_KEY;
    const apiSecret = TWILIO_API_SECRET;
    const twimlAppSid = TWILIO_TWIML_APP_SID;
    const fcmToken = req.query.fcmToken;
    const identity = req.query.identity;
    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) { return res.status(500).json({ error: 'Variables de entorno de Twilio no configuradas' }); }
    const token = new AccessToken(accountSid, apiKey, apiSecret, { identity: identity, ttl: 3600 });
    const voiceGrant = new VoiceGrant({ incomingAllow: true, outgoingApplicationSid: twimlAppSid, pushCredentialSid: 'CRe04e9804aebdc00ea2a2bf7203b5069c', });
    token.addGrant(voiceGrant);
    res.json({ token: token.toJwt(), identity: identity });
});

module.exports = router;