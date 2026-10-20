const axios = require('axios');

const TTLOCK_AUTH_URL = 'https://euapi.ttlock.com';
const TTLOCK_V3_URL = 'https://euapi.ttlock.com/v3';

function requireConfig(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error(`Missing TTLock configuration: ${name}`);
    error.status = 503;
    throw error;
  }
  return value;
}

function formHeaders() {
  return { 'Content-Type': 'application/x-www-form-urlencoded' };
}

/**
 * Exchanges username/password for a TTLock access token.
 */
async function ttlockLogin(username, password) {
  const clientId = requireConfig('TTLOCK_CLIENT_ID');
  const clientSecret = requireConfig('TTLOCK_CLIENT_SECRET');
  const { data } = await axios.post(
    `${TTLOCK_AUTH_URL}/oauth2/token`,
    new URLSearchParams({
      clientId,
      clientSecret,
      username,
      password
    }),
    { headers: formHeaders() }
  );
  return data;
}

/**
 * POST to a TTLock v3 endpoint, e.g. ttlockPost('/group/add', accessToken, { name })
 */
async function ttlockPost(path, accessToken, params = {}) {
  const { data } = await axios.post(
    `${TTLOCK_V3_URL}${path}`,
    new URLSearchParams({
      clientId: requireConfig('TTLOCK_CLIENT_ID'),
      accessToken,
      date: Date.now(),
      ...params
    }),
    { headers: formHeaders() }
  );
  return data;
}

/**
 * GET from a TTLock v3 endpoint, e.g. ttlockGet('/group/list', accessToken)
 */
async function ttlockGet(path, accessToken, params = {}) {
  const { data } = await axios.get(`${TTLOCK_V3_URL}${path}`, {
    params: {
      clientId: requireConfig('TTLOCK_CLIENT_ID'),
      accessToken,
      date: Date.now(),
      ...params
    }
  });
  return data;
}

module.exports = { ttlockLogin, ttlockPost, ttlockGet };
