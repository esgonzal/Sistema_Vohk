const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const { Server } = require('socket.io');

// Middleware

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const allowedOrigins = ['http://localhost:4200', 'https://app.vohk.cl', 'https://api.vohk.cl'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/\.base44\.app$/.test(new URL(origin).hostname)) return callback(null, true);
    callback(new Error(`CORS not allowed for this origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Preflight for all routes
app.options('*', cors());

// API v0
const { accessTokenStorage, storeAccessToken } = require('../backend/routes/v0/accessTokenStorage.js');
const logoutInterval = 30 * 60 * 1000;
const checkAndLogoutExpiredSessions = () => {
  const currentTime = Date.now();
  for (const userId in accessTokenStorage) {
    const user = accessTokenStorage[userId];
    if (user && user.loginTime && currentTime - user.loginTime >= logoutInterval) {
      delete accessTokenStorage[userId];
      console.log(`Logged out user with ID: ${userId}`);
    }
  }
};
const logoutIntervalId = setInterval(checkAndLogoutExpiredSessions, logoutInterval);
const v0Routes = require('./routes/v0');
app.use('/v0', v0Routes);
// API v1
const UserRouter = require('../backend/routes/v1/userAPI');
app.use('/v1/user', UserRouter);
const LockRouter = require('../backend/routes/v1/lockAPI');
app.use('/v1/lock', LockRouter);
const EkeyRouter = require('../backend/routes/v1/ekeyAPI');
app.use('/v1/ekey', EkeyRouter);
const PasscodeRouter = require('../backend/routes/v1/passcodeAPI');
app.use('/v1/passcode', PasscodeRouter);
const FingerprintRouter = require('../backend/routes/v1/fingerprintAPI');
app.use('/v1/fingerprint', FingerprintRouter);
const GroupRouter = require('../backend/routes/v1/groupAPI');
app.use('/v1/group', GroupRouter);
//Email
const emailRouter = require('../backend/routes/nodemailer/emailRoutes.js');
app.use('/mail', emailRouter);
//Camera Test
const cameraTest = require('../backend/routes/camera/camera.js');
app.use('/camera', cameraTest);
app.post('/api/alert', (req, res) => {
  console.log('🚨  ALERT RECEIVED:', req.body);
  const io = req.app.get('io');
  if (io) {
    io.emit('intruder-alert', req.body);
  }

  res.status(200).json({
    message: 'Alert received'
  });
});
//Monday Test
const mondayTest = require('../backend/routes/automation/monday_test.js');
app.use('/monday', mondayTest);
const twilioRoutes = require('./routes/twilio');
app.use('/twilio', twilioRoutes);
const intercomRouter = require('./routes/intercom/intercomAPI.js');
app.use('/intercom', intercomRouter);

// HTTP Configuration
const httpPort = 8080;
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins, // reuse your existing config
    methods: ['GET', 'POST'],
    credentials: true
  }
});
// make it accessible inside routes
app.set('io', io);

httpServer.listen(httpPort, () => {
  console.log(`HTTP Server is running on port ${httpPort}`);
});