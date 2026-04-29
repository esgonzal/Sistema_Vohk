const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const { Server } = require('socket.io');

// Middleware

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const allowedOrigins = ['http://localhost:4200', 'https://app.vohk.cl'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error(`CORS not allowed for this origin: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Preflight for all routes
app.options('*', cors());
/*
const corsOptions = {
    origin: ['https://app.vohk.cl', 'http://localhost:4200'],
};
app.use(cors(corsOptions));
*/
/*

// CORS and Cross-Origin Isolation headers
app.use((req, res, next) => {
  const allowedOrigins = ['https://app.vohk.cl', 'http://localhost:4200'];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  // Required for SharedArrayBuffer and WASM threads
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});
*/

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