import { useState, useEffect, useRef } from 'react';
import { Settings, WifiOff, Wifi, Home, RefreshCw, Trash2, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const WS_URL = `ws://${window.location.hostname}:3001`;

export default function Admin() {
  const [counters, setCounters] = useState(
    Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      currentNumber: 0,
      isActive: false,
      servedCount: 0 // number of customers served at this counter
    }))
  );
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState({
    totalServed: 0,
    activeCounters: 0,
    servedToday: 0
  });
  const wsRef = useRef(null);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const activeCount = counters.filter(c => c.isActive).length;
    const totalServed = counters.reduce((s, c) => s + (c.servedCount || 0), 0);
    setStats(prev => ({
      ...prev,
      totalServed: totalServed,
      activeCounters: activeCount,
      servedToday: totalServed
    }));
  }, [counters]);

  const connectWebSocket = () => {
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('Connected to server');
      setConnected(true);
      ws.send(JSON.stringify({ type: 'GET_STATE' }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch(message.type) {
        case 'INITIAL_STATE':
        case 'STATE_UPDATE':
          // ensure servedCount exists
          setCounters(message.data.counters.map(c => ({ ...c, servedCount: c.servedCount || 0 })));
          break;
        case 'NUMBER_CALLED':
          // server provided updated counters
          setCounters(message.data.counters.map(c => ({ ...c, servedCount: c.servedCount || 0 })));
          break;
        case 'COUNTER_CLEARED':
          setCounters(message.data.counters.map(c => ({ ...c, servedCount: c.servedCount || 0 })));
          break;
        case 'SYSTEM_RESET':
          setCounters(message.data.counters.map(c => ({ ...c, servedCount: 0 })));
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    ws.onclose = () => {
      console.log('Disconnected from server');
      setConnected(false);
      setTimeout(connectWebSocket, 3000);
    };

    wsRef.current = ws;
  };

  const resetSystem = () => {
    if (confirm('⚠️ Reset entire queue system? This will:\n- Clear all counters\n- Reset queue numbers to 1\n- Clear all data\n\nThis action cannot be undone.')) {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'RESET_SYSTEM' }));
        alert('✅ System has been reset successfully!');
      }
    }
  };

  const clearCounter = (counterId) => {
    if (confirm(`Clear Counter ${counterId}?`)) {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'CLEAR_COUNTER',
          counterId
        }));
      }
    }
  };

  // Voice announcement removed — no client-side speech

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="bg-white bg-opacity-20 text-white p-3 rounded-lg hover:bg-opacity-30 transition">
              <Home size={24} />
            </Link>
            <div className="text-white">
              <div className="flex items-center gap-3">
                <Settings size={48} />
                <h1 className="text-5xl font-bold">Admin Panel</h1>
              </div>
              <p className="text-purple-200 text-xl mt-2">System Management & Monitoring</p>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            connected ? 'bg-green-500' : 'bg-red-500'
          } text-white font-semibold`}>
            {connected ? <Wifi size={24} /> : <WifiOff size={24} />}
            <span className="text-lg">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Total Served</h3>
              <Activity className="text-blue-500" size={24} />
            </div>
            <p className="text-4xl font-bold text-blue-600">{stats.totalServed}</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Active Counters</h3>
              <Activity className="text-green-500" size={24} />
            </div>
            <p className="text-4xl font-bold text-green-600">{stats.activeCounters}</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Last Served</h3>
              <Activity className="text-purple-500" size={24} />
            </div>
            <p className="text-4xl font-bold text-purple-600">{stats.servedToday || '-'}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={resetSystem}
              disabled={!connected}
              className={`flex items-center justify-center gap-3 py-4 rounded-lg font-semibold text-lg transition ${
                connected
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Trash2 size={24} />
              Reset System
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-3 bg-blue-500 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-600 transition"
            >
              <RefreshCw size={24} />
              Refresh Page
            </button>
            
            <div className="flex items-center justify-center gap-3 bg-gray-100 text-gray-800 py-4 rounded-lg font-semibold text-lg">
              Voice announcements disabled
            </div>
          </div>
        </div>

        {/* Counters Grid */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Counter Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {counters.map((counter) => (
              <div
                key={counter.id}
                className="rounded-xl p-6 text-center transition bg-white shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-semibold">Counter {counter.id}</div>
                  <div className={`w-4 h-4 rounded-full ${counter.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>

                <div className="text-3xl font-bold mb-3">
                  {counter.isActive ? 'Occupied' : 'Available'}
                </div>

                <div className="text-sm text-gray-500 mb-4">
                  Served: <span className="font-semibold text-gray-800">{counter.servedCount || 0}</span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => clearCounter(counter.id)}
                    disabled={!connected}
                    className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition text-sm font-semibold"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Info */}
        <div className="mt-8 bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 text-white">
          <h3 className="text-xl font-bold mb-4">📊 System Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>WebSocket:</strong> {connected ? '✅ Connected' : '❌ Disconnected'}</p>
              <p><strong>Server:</strong> {WS_URL}</p>
            </div>
            <div>
              <p><strong>Voice Announcements:</strong> ❌ Disabled</p>
              <p><strong>Auto-Refresh:</strong> ✅ Real-time updates</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}