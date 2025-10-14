import { useState, useEffect, useRef } from 'react';
import { Smartphone, Phone, PhoneCall, CheckCircle2, WifiOff, Wifi, Home, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const isDev = import.meta && import.meta.env && import.meta.env.DEV;
const host = (() => {
  try {
    return window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
  } catch {
    return '127.0.0.1';
  }
})();
const WS_BASE = (() => {
  const override = import.meta?.env?.VITE_WS_URL;
  if (override && typeof override === 'string' && override.trim()) {
    return override.replace(/\/$/, '');
  }
  if (isDev) return `ws://${host}:3001`;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const hostport = location.host;
  return `${proto}://${hostport}`;
})();
const WS_URL = `${WS_BASE}/ws`;

export default function CounterPhone() {
  const [selectedCounter, setSelectedCounter] = useState(null);
  const [currentNumber, setCurrentNumber] = useState(0);
  const [connected, setConnected] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const wsRef = useRef(null);
  const retryDelayRef = useRef(500);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('Connected to server');
      setConnected(true);
      retryDelayRef.current = 500;
      ws.send(JSON.stringify({ type: 'GET_STATE' }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch(message.type) {
        case 'INITIAL_STATE':
        case 'STATE_UPDATE':
          if (selectedCounter) {
            const counter = message.data.counters.find(c => c.id === selectedCounter);
            if (counter) {
              setCurrentNumber(counter.currentNumber);
              setIsActive(!!counter.isActive);
            }
          }
          break;
        case 'NUMBER_CALLED':
          if (selectedCounter && message.data.counterId === selectedCounter) {
            // set occupied indicator (we use currentNumber>0 as occupied)
            setCurrentNumber(1);
          }
          break;
        // ANNOUNCE messages removed — server no longer requests client-side speech
        case 'COUNTER_CLEARED':
          if (selectedCounter && message.data.counterId === selectedCounter) {
            setCurrentNumber(0);
            setIsActive(false);
          }
          break;
        case 'COUNTER_STATUS_UPDATED':
          if (selectedCounter && message.data.counterId === selectedCounter) {
            const c = message.data.counters.find(x => x.id === selectedCounter);
            if (c) {
              setCurrentNumber(c.currentNumber);
              setIsActive(!!c.isActive);
            }
          }
          break;
        case 'SYSTEM_RESET':
          setCurrentNumber(0);
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
      try { ws.close(); } catch {}
    };

    ws.onclose = () => {
      console.log('Disconnected from server');
      setConnected(false);
      const delay = Math.min(retryDelayRef.current, 5000);
      setTimeout(connectWebSocket, delay);
      retryDelayRef.current = Math.min(delay * 2, 5000);
    };

    wsRef.current = ws;
  };

  const callNext = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      alert('Not connected to server. Please check your connection.');
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'CALL_NEXT',
      counterId: selectedCounter
    }));

  // calling next updates counter state on server and displays; no voice announcement

    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
  };

  const clearCounter = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'CLEAR_COUNTER',
        counterId: selectedCounter
      }));
    }
  };

  const toggleStatus = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'SET_STATUS',
        counterId: selectedCounter,
        isActive: !isActive
      }));
    }
  };

  if (!selectedCounter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <Link to="/" className="bg-white bg-opacity-20 text-white p-3 rounded-lg hover:bg-opacity-30 transition">
              <Home size={24} />
            </Link>
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              connected ? 'bg-green-500' : 'bg-red-500'
            } text-white font-semibold`}>
              {connected ? <Wifi size={20} /> : <WifiOff size={20} />}
              {connected ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          <div className="text-center mb-8">
            <Smartphone className="mx-auto mb-4 text-white" size={64} />
            <h1 className="text-4xl font-bold text-white mb-2">Counter Phone</h1>
            <p className="text-blue-100 text-xl">Select your counter number</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              🔒 Staff Only Access
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <button
                  key={num}
                  onClick={() => setSelectedCounter(num)}
                  disabled={!connected}
                  className={`py-8 px-6 rounded-xl transition text-3xl font-bold shadow-lg active:scale-95 ${
                    connected
                      ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800'
                      : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setSelectedCounter(null)}
            className="text-white text-xl flex items-center gap-2 hover:underline"
          >
            ← Change Counter
          </button>
          <div className={`p-3 rounded-lg flex items-center gap-2 ${
            connected ? 'bg-green-700' : 'bg-red-500'
          } text-white font-semibold`}>
            {connected ? <Wifi size={20} /> : <WifiOff size={20} />}
            {connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-8 text-center">
            <Smartphone className="mx-auto mb-3" size={48} />
            <h1 className="text-5xl font-bold">Counter {selectedCounter}</h1>
            <p className="text-green-100 text-xl mt-2">Staff Terminal</p>
          </div>

          <div className="p-12">
            <div className="text-center mb-10">
              <p className="text-gray-600 text-3xl mb-4">Currently Serving</p>
              <div className={`rounded-2xl p-12 ${
                currentNumber > 0 
                  ? 'bg-gradient-to-br from-green-500 to-green-700' 
                  : 'bg-gray-200'
              }`}>
                <div className={`text-9xl font-bold ${
                  currentNumber > 0 ? 'text-white' : 'text-gray-400'
                }`}>
                  {currentNumber || '-'}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={callNext}
                disabled={!connected}
                className={`w-full py-8 rounded-2xl transition text-3xl font-bold shadow-xl flex items-center justify-center gap-3 active:scale-95 ${
                  connected
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                    : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                }`}
              >
                <PhoneCall size={36} />
                Call Next Customer
              </button>
              
              <button
                onClick={clearCounter}
                disabled={!connected}
                className={`w-full py-6 rounded-2xl transition text-2xl font-semibold flex items-center justify-center gap-3 active:scale-95 ${
                  connected
                    ? 'bg-gray-400 text-white hover:bg-gray-500'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <X size={32} />
                Clear Counter
              </button>

              <button
                onClick={toggleStatus}
                disabled={!connected}
                className={`w-full py-6 rounded-2xl transition text-2xl font-semibold flex items-center justify-center gap-3 active:scale-95 ${
                  connected
                    ? (isActive ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600')
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                {isActive ? 'Mark Available' : 'Mark Occupied'}
              </button>
            </div>

            <div className="mt-8 pt-8 border-t-2 border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-gray-600 text-lg">Status</p>
                  <p className="text-blue-600 text-4xl font-bold">{isActive ? 'Occupied' : 'Available'}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-gray-600 text-lg">Your Counter</p>
                  <p className="text-green-600 text-4xl font-bold">{selectedCounter}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
              <p className="text-yellow-800 font-semibold text-center">
                  💡 Calling a customer will update counter status on all displays
                </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}