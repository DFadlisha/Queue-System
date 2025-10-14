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
        } catch {
          resolve({});
        }
      });
    } catch {
      resolve({});
    }
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { counterId, isActive } = (req.body || (await parseBody(req))) || {};
  if (!counterId) return res.status(400).json({ error: 'counterId required' });
  const state = (await redis.get('queue:state')) || { counters: [] };
  const idx = Number(counterId) - 1;
  state.counters[idx] = {
    ...(state.counters[idx] || { id: Number(counterId), currentNumber: 0, isActive: false, servedCount: 0 }),
    isActive: !!isActive,
    currentNumber: !!isActive ? (state.counters[idx]?.currentNumber || 1) : 0,
  };
  state.lastEvent = { type: 'COUNTER_STATUS_UPDATED', counterId, isActive: !!isActive, ts: Date.now() };
  state.updatedAt = Date.now();
  try { await redis.set('queue:state', state); } catch (e) { console.error('Redis set error:', e); }
  res.status(200).json(state);
}
