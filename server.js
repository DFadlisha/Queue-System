import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Queue state (no ticket numbers)
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server is ready`);
});
