const activityRepository = require('../../repositories/activityRepository');

async function listActivities(user, query) {
    if (!['admin', 'superadmin', 'resident'].includes(user.role)) {
        const error = new Error('Forbidden');
        error.status = 403;
        throw error;
    }
    const requestedLimit = Number.parseInt(query.limit, 10);
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 30;
    if (query.condominiumId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.condominiumId)) {
        const error = new Error('Invalid condominium ID');
        error.status = 400;
        throw error;
    }
    const before = query.before ? new Date(query.before) : null;
    if (before && Number.isNaN(before.getTime())) {
        const error = new Error('Invalid before timestamp');
        error.status = 400;
        throw error;
    }
    const eventType = query.eventType || null;
    if (eventType && !['door_open', 'call', 'access'].includes(eventType)) {
        const error = new Error('Invalid event type');
        error.status = 400;
        throw error;
    }
    return activityRepository.listActivities({
        userId: user.userId,
        role: user.role,
        condominiumId: query.condominiumId || null,
        limit,
        before: before?.toISOString() || null,
        eventType,
    });
}

module.exports = { listActivities };
