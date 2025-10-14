import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only API to sync state across devices on your LAN while running `npm run dev`.
function devApiPlugin() {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      // In-memory state for local development
      let state = {
        counters: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, currentNumber: 0, isActive: false, servedCount: 0 })),
        lastEvent: null,
        updatedAt: Date.now(),
      };

      function sendJson(res, obj, status = 200) {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(obj));
      }

      async function readBody(req) {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString('utf8');
        try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
      }

      server.middlewares.use(async (req, res, next) => {
        const { url, method } = req;
        if (!url || !url.startsWith('/api/queue')) return next();

        try {
          if (url === '/api/queue/state' && method === 'GET') {
            if (!state) {
              state = {
                counters: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, currentNumber: 0, isActive: false, servedCount: 0 })),
                lastEvent: null,
                updatedAt: Date.now(),
              };
            }
            return sendJson(res, state);
          }

          if (url === '/api/queue/callNext' && method === 'POST') {
            const { counterId } = await readBody(req);
            if (!counterId) return sendJson(res, { error: 'counterId required' }, 400);
            const idx = Number(counterId) - 1;
            state.counters[idx] = {
              ...(state.counters[idx] || { id: Number(counterId), currentNumber: 0, isActive: false, servedCount: 0 }),
              currentNumber: 1,
              isActive: true,
              servedCount: ((state.counters[idx]?.servedCount) || 0) + 1,
            };
            state.lastEvent = { type: 'NUMBER_CALLED', counterId, ts: Date.now() };
            state.updatedAt = Date.now();
            return sendJson(res, state);
          }

          if (url === '/api/queue/clearCounter' && method === 'POST') {
            const { counterId } = await readBody(req);
            if (!counterId) return sendJson(res, { error: 'counterId required' }, 400);
            const idx = Number(counterId) - 1;
            state.counters[idx] = {
              ...(state.counters[idx] || { id: Number(counterId), currentNumber: 0, isActive: false, servedCount: 0 }),
              currentNumber: 0,
              isActive: false,
            };
            state.lastEvent = { type: 'COUNTER_CLEARED', counterId, ts: Date.now() };
            state.updatedAt = Date.now();
            return sendJson(res, state);
          }

          if (url === '/api/queue/setStatus' && method === 'POST') {
            const { counterId, isActive } = await readBody(req);
            if (!counterId) return sendJson(res, { error: 'counterId required' }, 400);
            const idx = Number(counterId) - 1;
            state.counters[idx] = {
              ...(state.counters[idx] || { id: Number(counterId), currentNumber: 0, isActive: false, servedCount: 0 }),
              isActive: !!isActive,
            };
            state.lastEvent = { type: 'COUNTER_STATUS_UPDATED', counterId, isActive: !!isActive, ts: Date.now() };
            state.updatedAt = Date.now();
            return sendJson(res, state);
          }

          if (url === '/api/queue/reset' && method === 'POST') {
            state = {
              counters: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, currentNumber: 0, isActive: false, servedCount: 0 })),
              lastEvent: { type: 'SYSTEM_RESET', ts: Date.now() },
              updatedAt: Date.now(),
            };
            return sendJson(res, state);
          }

          return next();
        } catch (e) {
          return sendJson(res, { error: 'dev api error' }, 500);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: true
  }
})