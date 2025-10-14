import { Redis } from '@upstash/redis';

function initRedis() {
  let url = process.env.UPSTASH_REDIS_REST_URL;
  let token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url) url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_REDIS_URL;
  if (!token) token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  return new Redis({ url, token });
}
const redis = initRedis();

// (Optional) parse body if future reset options are added
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

const initialState = {
  counters: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, currentNumber: 0, isActive: false, servedCount: 0 })),
  lastEvent: { type: 'SYSTEM_RESET', ts: Date.now() },
  updatedAt: Date.now(),
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // Drain body (ignored)
  await parseBody(req);
  initialState.updatedAt = Date.now();
  try { await redis.set('queue:state', initialState); } catch (e) { console.error('Redis set error:', e); }
  res.status(200).json(initialState);
}
