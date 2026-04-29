const { accessTokenStorage } = require('../routes/v0/accessTokenStorage');

function getAccessToken(userID) {
    return accessTokenStorage[userID]?.accessToken || null;
}

function buildHeaders(accessToken) {
    return {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${accessToken}`
    };
}

function getAccessTokenOrFail(userID, res) {
    const accessToken = getAccessToken(userID);

    if (!accessToken) {
        res.status(401).json({
            errcode: 10003,
            errmsg: 'No se encontró accessToken'
        });
        return null;
    }

    return accessToken;
}

module.exports = { getAccessToken, buildHeaders, getAccessTokenOrFail };