const crypto = require('crypto');
const intercomUserRepository = require('../../repositories/intercomUserRepository');

function httpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizeName(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('es')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function diceSimilarity(left, right) {
    if (left === right) return 1;
    if (left.length < 2 || right.length < 2) return 0;
    const pairs = new Map();
    for (let index = 0; index < left.length - 1; index++) {
        const pair = left.slice(index, index + 2);
        pairs.set(pair, (pairs.get(pair) || 0) + 1);
    }
    let overlap = 0;
    for (let index = 0; index < right.length - 1; index++) {
        const pair = right.slice(index, index + 2);
        const count = pairs.get(pair) || 0;
        if (count > 0) {
            overlap++;
            pairs.set(pair, count - 1);
        }
    }
    return (2 * overlap) / (left.length + right.length - 2);
}

function matchScore(query, legalName) {
    const candidate = normalizeName(legalName);
    if (!candidate) return 0;
    if (candidate === query) return 1;
    const queryTokens = query.split(' ');
    const candidateTokens = new Set(candidate.split(' '));
    const tokenCoverage = queryTokens.filter(token => candidateTokens.has(token)).length / queryTokens.length;
    const similarity = diceSimilarity(query, candidate);
    return Math.max(similarity, tokenCoverage === 1 ? 0.82 : tokenCoverage * 0.7);
}

function createResolutionToken(secret, deviceId, resident) {
    return crypto.createHmac('sha256', secret)
        .update(`alma-resident:${deviceId}:${resident.user_id}:${resident.unit_id}`)
        .digest('base64url');
}

function publicCandidate(secret, deviceId, resident) {
    return {
        displayName: resident.legal_name,
        roomNo: resident.room_no,
        buildingName: resident.building_name,
        resolutionToken: createResolutionToken(secret, deviceId, resident),
    };
}

function createService({ repository = intercomUserRepository, deviceId = process.env.ALMA_DEVICE_ID,
    tokenSecret = process.env.ALMA_RESOLUTION_TOKEN_SECRET || process.env.ALMA_WEBHOOK_SECRET } = {}) {
    async function resolveResident(name) {
        if (!deviceId || !tokenSecret) throw httpError(503, 'Alma integration is not configured');
        if (typeof name !== 'string') throw httpError(400, 'name must be a string');
        const query = normalizeName(name);
        if (query.length < 3 || query.length > 100) throw httpError(400, 'name must contain between 3 and 100 characters');

        const residents = await repository.findCallableResidentsByDevice(deviceId);
        const matches = residents
            .map(resident => ({ resident, score: matchScore(query, resident.legal_name) }))
            .filter(match => match.score >= 0.55)
            .sort((left, right) => right.score - left.score || left.resident.legal_name.localeCompare(right.resident.legal_name, 'es'));

        if (!matches.length) return { status: 'not_found' };
        const bestScore = matches[0].score;
        const finalists = matches.filter(match => match.score >= bestScore - 0.08).slice(0, 3);
        if (finalists.length === 1 && (bestScore >= 0.75 || bestScore - (matches[1]?.score || 0) >= 0.12)) {
            return { status: 'found', ...publicCandidate(tokenSecret, deviceId, finalists[0].resident) };
        }
        return {
            status: 'ambiguous',
            question: 'Encontré más de una coincidencia. ¿Puede indicar la torre o el departamento?',
            options: finalists.map(match => publicCandidate(tokenSecret, deviceId, match.resident)),
        };
    }

    return { resolveResident };
}

module.exports = { createService, normalizeName, matchScore };
