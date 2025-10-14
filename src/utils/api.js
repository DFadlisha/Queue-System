// Minimal client for Vercel serverless API routes with polling subscribe

const BASE = ''; // same-origin

export async function getState() {
  const res = await fetch(`${BASE}/api/queue/state`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch state');
  return res.json();
}

export function subscribeState(cb, intervalMs = 1500) {
  let stopped = false;
  let timer = null;
  let lastState = null;

  const tick = async () => {
    try {
      const s = await getState();
      lastState = s;
      cb(s);
    } catch (e) {
      // on error, still notify disconnected via cb(null)? We'll noop and retry
    } finally {
      if (!stopped) {
        timer = setTimeout(tick, intervalMs);
      }
    }
  };
  tick();
  return () => { stopped = true; if (timer) clearTimeout(timer); };
}

export async function callNext(counterId) {
  const res = await fetch(`${BASE}/api/queue/callNext`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ counterId })
  });
  if (!res.ok) throw new Error('callNext failed');
  return res.json();
}

export async function clearCounter(counterId) {
  const res = await fetch(`${BASE}/api/queue/clearCounter`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ counterId })
  });
  if (!res.ok) throw new Error('clearCounter failed');
  return res.json();
}

export async function setStatus(counterId, isActive) {
  const res = await fetch(`${BASE}/api/queue/setStatus`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ counterId, isActive })
  });
  if (!res.ok) throw new Error('setStatus failed');
  return res.json();
}

export async function resetSystem() {
  const res = await fetch(`${BASE}/api/queue/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('reset failed');
  return res.json();
}
