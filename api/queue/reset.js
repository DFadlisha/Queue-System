import { kv } from '@vercel/kv';

const initialState = {
  counters: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, currentNumber: 0, isActive: false, servedCount: 0 })),
  lastEvent: { type: 'SYSTEM_RESET', ts: Date.now() },
  updatedAt: Date.now(),
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  initialState.updatedAt = Date.now();
  await kv.set('queue:state', initialState);
  res.status(200).json(initialState);
}
