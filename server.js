import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const app = express();
const server = http.createServer(app);
// mount WebSocket on a path so clients can use same-origin URL
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

// Serve static frontend only in production (after `npm run build`)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');
const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  app.use(express.static(distPath));
}

// Counter availability state
let queueState = {
  counters: Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    currentNumber: 0,
    isActive: false,
    servedCount: 0
  }))
};

// Voice announcement feature removed: no announcer connection is used.

// Broadcast to all connected clients
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify(data));
    }
  });
}

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('Client connected');

  // Send current state to new client
  ws.send(JSON.stringify({
    type: 'INITIAL_STATE',
    data: queueState
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch(data.type) {
        // announcer registration removed
        case 'CALL_NEXT': {
          const counterId = data.counterId;
          const counterIndex = queueState.counters.findIndex(c => c.id === counterId);
          if (counterIndex !== -1) {
            // mark occupied and increment served count
            queueState.counters[counterIndex] = {
              ...queueState.counters[counterIndex],
              currentNumber: 1, // placeholder to indicate occupied
              isActive: true,
              servedCount: (queueState.counters[counterIndex].servedCount || 0) + 1
            };
          }

          broadcast({
            type: 'NUMBER_CALLED',
            data: {
              counterId,
              counters: queueState.counters
            }
          });
          // voice announcements disabled — no ANNOUNCE sent
        }
        break;

        case 'CLEAR_COUNTER': {
          const clearCounterId = data.counterId;
          const clearIndex = queueState.counters.findIndex(c => c.id === clearCounterId);
          if (clearIndex !== -1) {
            queueState.counters[clearIndex] = {
              ...queueState.counters[clearIndex],
              currentNumber: 0,
              isActive: false
            };
          }

          broadcast({
            type: 'COUNTER_CLEARED',
            data: {
              counterId: clearCounterId,
              counters: queueState.counters
            }
          });
        }
        break;

        case 'RESET_SYSTEM':
          queueState = {
            counters: Array.from({ length: 10 }, (_, i) => ({
              id: i + 1,
              currentNumber: 0,
              isActive: false,
              servedCount: 0
            }))
          };

          broadcast({
            type: 'SYSTEM_RESET',
            data: queueState
          });
          break;

        case 'SET_STATUS': {
          const { counterId, isActive } = data;
          const idx = queueState.counters.findIndex(c => c.id === counterId);
          if (idx !== -1) {
            queueState.counters[idx] = {
              ...queueState.counters[idx],
              isActive: !!isActive,
              currentNumber: isActive ? 1 : 0
            };
          }

          broadcast({
            type: 'COUNTER_STATUS_UPDATED',
            data: {
              counterId,
              counters: queueState.counters
            }
          });
        }
        break;

        case 'GET_STATE':
          ws.send(JSON.stringify({
            type: 'STATE_UPDATE',
            data: queueState
          }));
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Backend status page
app.get('/', (req, res) => {
  res.json({
    status: 'Queue System Backend Running',
    port: PORT,
    websocket: `/ws`,
    api: {
      state: '/api/state',
      reset: '/api/reset'
    },
    frontend: isProd ? 'Served from this server' : 'Running on separate Vite server',
    counters: queueState.counters.length,
    activeConnections: wss.clients.size
  });
});

// REST API endpoints (optional backup)
app.get('/api/state', (req, res) => {
  res.json(queueState);
});

app.post('/api/reset', (req, res) => {
  queueState = {
    counters: Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      currentNumber: 0,
      isActive: false,
      servedCount: 0
    }))
  };
  broadcast({
    type: 'SYSTEM_RESET',
    data: queueState
  });
  res.json({ success: true, data: queueState });
});

// React Router fallback to index.html (Express 5: use regex instead of '*') only in production
if (isProd) {
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`WebSocket server ready at ws://<host>:${PORT}/ws`);
});
