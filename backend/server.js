const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const pool = require('../backend/database/db.js');
// Middleware

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const allowedOrigins = ['http://localhost:4200', 'https://app.vohk.cl'];

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
const v1Routes = require('./routes/v1');
app.use('/v1', v1Routes);
const emailRouter = require('../backend/routes/nodemailer/emailRoutes.js');
app.use('/mail', emailRouter);
const mondayTest = require('../backend/routes/automation/monday_test.js');
app.use('/monday', mondayTest);
const appRouter = require('./routes/vohk_app');
app.use('/app', appRouter);
const dbTestRouter = require('./routes/dbTest');
app.use('/db', dbTestRouter);;

app.use("/debug.jpg", (req, res) => {
  res.sendFile("/opt/vohk_ai/debug_center.jpg");
});

// HTTP Configuration
const httpPort = 8080;
const httpServer = http.createServer(app);

httpServer.listen(httpPort, () => {
  console.log(`HTTP Server is running on port ${httpPort}`);
});