import { kv } from '@vercel/kv';

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
  let state = await kv.get('queue:state');
  if (!state) {
    await kv.set('queue:state', initialState);
    state = initialState;
  }
  res.status(200).json(state);
}
