// Client-side only API using localStorage for the Queue System PWA.

const LS_KEY = 'queue:state';
const LS_PING = 'queue:state:pulse'; // to trigger storage events

const initialState = () => ({
  counters: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, currentNumber: 0, isActive: false, servedCount: 0 })),
  lastEvent: null,
  updatedAt: Date.now(),
});

function getLocalState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { }
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
  } catch { }
}

export async function getState() {
  return getLocalState();
}

export function subscribeState(cb, intervalMs = 1500) {
  let stopped = false;
  let timer = null;

  const notify = () => {
    try {
      const s = getLocalState();
      cb(s);
    } catch { }
  };

  // storage event listener for local sync (multi-tab)
  const onStorage = (e) => {
    if (e.key === LS_KEY || e.key === LS_PING) {
      notify();
    }
  };
  try { window.addEventListener('storage', onStorage); } catch { }

  const tick = () => {
    notify();
    if (!stopped) timer = setTimeout(tick, intervalMs);
  };
  tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    try { window.removeEventListener('storage', onStorage); } catch { }
  };
}

export async function callNext(counterId) {
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

export async function clearCounter(counterId) {
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

export async function setStatus(counterId, isActive) {
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

export async function resetSystem() {
  const currentState = getLocalState();
  const count = currentState.counters?.length || 8;
  const s = {
    ...initialState(),
    counters: Array.from({ length: count }, (_, i) => ({ id: i + 1, currentNumber: 0, isActive: false, servedCount: 0 })),
    lastEvent: { type: 'SYSTEM_RESET', ts: Date.now() }
  };
  setLocalState(s);
  return s;
}

export async function updateCounters(count) {
  const newCount = parseInt(count, 10);
  if (isNaN(newCount) || newCount < 1) throw new Error('Invalid counter count');

  const state = getLocalState();
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
  setLocalState(state);
  return state;
}

