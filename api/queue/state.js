import { Redis } from '@upstash/redis';

// Support multiple possible injected env var names by normalizing to expected keys.
function initRedis() {
  // Official expected names
  let url = process.env.UPSTASH_REDIS_REST_URL;
  let token = process.env.UPSTASH_REDIS_REST_TOKEN;
  // Fallback variants that some Marketplace installs may produce
  if (!url) url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_REDIS_URL;
  if (!token) token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  if (!url || !token) {
    console.error('Upstash Redis env vars missing. Have URL?', !!url, 'Have TOKEN?', !!token);
  }
  return new Redis({ url, token });
}

const redis = initRedis();

const initialState = {
  counters: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, currentNumber: 0, isActive: false, servedCount: 0 })),
  lastEvent: null,
  updatedAt: Date.now(),
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  let state;
  try {
    state = await redis.get('queue:state');
  } catch (e) {
    console.error('Redis get error:', e);
  }
  if (!state) {
    try { await redis.set('queue:state', initialState); } catch (e) { console.error('Redis set init error:', e); }
    state = initialState;
  }
  res.status(200).json(state);
}
