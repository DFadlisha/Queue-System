import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { counterId } = req.body || {};
  if (!counterId) return res.status(400).json({ error: 'counterId required' });
  const state = (await kv.get('queue:state')) || { counters: [] };
  const idx = Number(counterId) - 1;
  state.counters[idx] = {
    ...(state.counters[idx] || { id: Number(counterId), currentNumber: 0, isActive: false, servedCount: 0 }),
    currentNumber: 1,
    isActive: true,
    servedCount: ((state.counters[idx]?.servedCount) || 0) + 1,
  };
  state.lastEvent = { type: 'NUMBER_CALLED', counterId, ts: Date.now() };
  state.updatedAt = Date.now();
  await kv.set('queue:state', state);
  res.status(200).json(state);
}
