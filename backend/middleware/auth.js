function requireAccessToken(req, res, next) {
    const authHeader = req.headers['authorization'] || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ errmsg: 'Missing or malformed access token' });
    }

    req.accessToken = token;
    next();
}

module.exports = { requireAccessToken };
