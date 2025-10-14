import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { counterId, isActive } = req.body || {};
  if (!counterId) return res.status(400).json({ error: 'counterId required' });
  const state = (await kv.get('queue:state')) || { counters: [] };
  const idx = Number(counterId) - 1;
  state.counters[idx] = {
    ...(state.counters[idx] || { id: Number(counterId), currentNumber: 0, isActive: false, servedCount: 0 }),
    isActive: !!isActive,
    currentNumber: !!isActive ? (state.counters[idx]?.currentNumber || 1) : 0,
  };
  state.lastEvent = { type: 'COUNTER_STATUS_UPDATED', counterId, isActive: !!isActive, ts: Date.now() };
  state.updatedAt = Date.now();
  await kv.set('queue:state', state);
  res.status(200).json(state);
}
