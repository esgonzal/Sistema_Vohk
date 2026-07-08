const axios = require('axios');

// TODO: move these to env vars (process.env.TTLOCK_CLIENT_ID / TTLOCK_CLIENT_SECRET)
const TTLOCK_CLIENT_ID = 'c4114592f7954ca3b751c44d81ef2c7d';
const TTLOCK_CLIENT_SECRET = '33b556bdb803763f2e647fc7a357dedf';
const TTLOCK_AUTH_URL = 'https://euapi.ttlock.com';
const TTLOCK_V3_URL = 'https://euapi.ttlock.com/v3';

function formHeaders() {
  return { 'Content-Type': 'application/x-www-form-urlencoded' };
}

/**
 * Exchanges username/password for a TTLock access token.
 */
async function ttlockLogin(username, password) {
  const { data } = await axios.post(
    `${TTLOCK_AUTH_URL}/oauth2/token`,
    new URLSearchParams({
      clientId: TTLOCK_CLIENT_ID,
      clientSecret: TTLOCK_CLIENT_SECRET,
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
      clientId: TTLOCK_CLIENT_ID,
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
      clientId: TTLOCK_CLIENT_ID,
      accessToken,
      date: Date.now(),
      ...params
    }
  });
  return data;
}

module.exports = { ttlockLogin, ttlockPost, ttlockGet, TTLOCK_CLIENT_ID };