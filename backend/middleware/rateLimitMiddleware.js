function normalizeKeyPart(value) {
    return String(value || '').trim().toLowerCase().slice(0, 200);
}

function createRateLimiter({ windowMs, limit, key = req => req.ip, message = 'Too many requests. Try again later.' }) {
    const attempts = new Map();

    return function rateLimit(req, res, next) {
        const now = Date.now();
        const bucketKey = normalizeKeyPart(key(req)) || 'unknown';
        let bucket = attempts.get(bucketKey);

        if (!bucket || bucket.resetAt <= now) {
            bucket = { count: 0, resetAt: now + windowMs };
            attempts.set(bucketKey, bucket);
        }

        bucket.count += 1;
        res.set('RateLimit-Limit', String(limit));
        res.set('RateLimit-Remaining', String(Math.max(0, limit - bucket.count)));
        res.set('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

        if (attempts.size > 10_000) {
            for (const [storedKey, storedBucket] of attempts) {
                if (storedBucket.resetAt <= now) attempts.delete(storedKey);
            }
        }

        if (bucket.count > limit) {
            const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({ error: message });
        }

        next();
    };
}

module.exports = { createRateLimiter };
