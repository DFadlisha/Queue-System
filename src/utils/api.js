// Client for Vercel serverless API with a dev-local fallback using localStorage.

const BASE = '';
const LS_KEY = 'queue:state';
const LS_PING = 'queue:state:pulse'; // to trigger storage events

const initialState = () => ({
  counters: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, currentNumber: 0, isActive: false, servedCount: 0 })),
  lastEvent: null,
  updatedAt: Date.now(),
});

let useLocal = false;

async function getRemoteState() {
  const res = await fetch(`${BASE}/api/queue/state`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch state');
  return res.json();
}

function getLocalState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const s = initialState();
  setLocalState(s);
  return s;
}

function setLocalState(state) {
  try {
    const s = { ...state, updatedAt: Date.now() };
    localStorage.setItem(LS_KEY, JSON.stringify(s));
    // touch pulse key to fire storage events reliably
    localStorage.setItem(LS_PING, String(Date.now()));
  } catch {}
}

export async function getState() {
  if (useLocal) return getLocalState();
  try {
    const s = await getRemoteState();
    return s;
  } catch (e) {
    // Fallback to local mode in dev environments
    if (import.meta?.env?.DEV) {
      useLocal = true;
      return getLocalState();
    }
    throw e;
  }
}

export function subscribeState(cb, intervalMs = 1500) {
  let stopped = false;
  let timer = null;

  const notify = async () => {
    try {
      const s = await getState();
      cb(s);
    } catch {
      // ignore, will retry
    }
  };

  // storage event listener for local fallback (same-machine, multi-tab)
  const onStorage = (e) => {
    if (!useLocal) return;
    if (e.key === LS_KEY || e.key === LS_PING) {
      try { cb(getLocalState()); } catch {}
    }
  };
  try { window.addEventListener('storage', onStorage); } catch {}

  const tick = async () => {
    await notify();
    if (!stopped) timer = setTimeout(tick, intervalMs);
  };
  tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    try { window.removeEventListener('storage', onStorage); } catch {}
  };
}

export async function callNext(counterId) {
  if (useLocal) {
    const state = getLocalState();
    const idx = Number(counterId) - 1;
    state.counters[idx] = {
      ...(state.counters[idx] || { id: Number(counterId), currentNumber: 0, isActive: false, servedCount: 0 }),
      currentNumber: 1,
      isActive: true,
      servedCount: ((state.counters[idx]?.servedCount) || 0) + 1,
    };
    state.lastEvent = { type: 'NUMBER_CALLED', counterId, ts: Date.now() };
    setLocalState(state);
    return state;
  }
  const res = await fetch(`${BASE}/api/queue/callNext`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ counterId })
  });
  if (!res.ok) throw new Error('callNext failed');
  return res.json();
}

export async function clearCounter(counterId) {
  if (useLocal) {
    const state = getLocalState();
    const idx = Number(counterId) - 1;
    state.counters[idx] = {
      ...(state.counters[idx] || { id: Number(counterId), currentNumber: 0, isActive: false, servedCount: 0 }),
      currentNumber: 0,
      isActive: false,
    };
    state.lastEvent = { type: 'COUNTER_CLEARED', counterId, ts: Date.now() };
    setLocalState(state);
    return state;
  }
  const res = await fetch(`${BASE}/api/queue/clearCounter`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ counterId })
  });
  if (!res.ok) throw new Error('clearCounter failed');
  return res.json();
}

export async function setStatus(counterId, isActive) {
  if (useLocal) {
    const state = getLocalState();
    const idx = Number(counterId) - 1;
    state.counters[idx] = {
      ...(state.counters[idx] || { id: Number(counterId), currentNumber: 0, isActive: false, servedCount: 0 }),
      isActive: !!isActive,
    };
    state.lastEvent = { type: 'COUNTER_STATUS_UPDATED', counterId, isActive: !!isActive, ts: Date.now() };
    setLocalState(state);
    return state;
  }
  const res = await fetch(`${BASE}/api/queue/setStatus`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ counterId, isActive })
  });
  if (!res.ok) throw new Error('setStatus failed');
  return res.json();
}

export async function resetSystem() {
  if (useLocal) {
    const s = initialState();
    s.lastEvent = { type: 'SYSTEM_RESET', ts: Date.now() };
    setLocalState(s);
    return s;
  }
  const res = await fetch(`${BASE}/api/queue/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('reset failed');
  return res.json();
}
