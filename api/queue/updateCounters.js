import { Redis } from '@upstash/redis';

function initRedis() {
    let url = process.env.UPSTASH_REDIS_REST_URL;
    let token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url) url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_REDIS_URL;
    if (!token) token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
    return new Redis({ url, token });
}
const redis = initRedis();

async function parseBody(req) {
    return new Promise((resolve) => {
        try {
            const chunks = [];
            req.on('data', (c) => chunks.push(c));
            req.on('end', () => {
                try {
                    const raw = Buffer.concat(chunks).toString('utf8');
                    resolve(raw ? JSON.parse(raw) : {});
                } catch { resolve({}); }
            });
        } catch { resolve({}); }
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { count } = (req.body || (await parseBody(req))) || {};
    const newCount = parseInt(count, 10);

    if (isNaN(newCount) || newCount < 1) {
        return res.status(400).json({ error: 'Invalid counter count' });
    }

    let state = (await redis.get('queue:state')) || {
        counters: [],
        lastEvent: null,
        updatedAt: Date.now()
    };

    const currentCounters = state.counters || [];
    let nextCounters = [...currentCounters];

    if (newCount > currentCounters.length) {
        // Add new counters
        for (let i = currentCounters.length; i < newCount; i++) {
            nextCounters.push({ id: i + 1, currentNumber: 0, isActive: false, servedCount: 0 });
        }
    } else if (newCount < currentCounters.length) {
        // Remove counters
        nextCounters = currentCounters.slice(0, newCount);
    }

    state.counters = nextCounters;
    state.lastEvent = { type: 'COUNTERS_UPDATED', count: newCount, ts: Date.now() };
    state.updatedAt = Date.now();

    try {
        await redis.set('queue:state', state);
    } catch (e) {
        console.error('Redis set error:', e);
    }

    res.status(200).json(state);
}
