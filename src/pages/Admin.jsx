import { useState, useEffect, useRef } from 'react';
import { Settings, Home, RefreshCw, RefreshCcw, Trash2, Activity, PhoneCall } from 'lucide-react';
import { Link } from 'react-router-dom';
import { subscribeState, callNext as apiCallNext, clearCounter as apiClearCounter, resetSystem as apiResetSystem, updateCounters as apiUpdateCounters } from '../utils/api';

export default function Admin() {
  const [connected, setConnected] = useState(true);
  const [counters, setCounters] = useState([]);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [newCounterCount, setNewCounterCount] = useState('');
  const unsubRef = useRef(null);

  const stats = {
    totalServed: counters.reduce((sum, c) => sum + (c.servedCount || 0), 0),
    activeCounters: counters.filter(c => c.isActive).length,
    servedToday: counters.reduce((sum, c) => sum + (c.servedCount || 0), 0)
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const unsub = await subscribeState((state) => {
          if (!mounted || !state) return;
          const counters = (state.counters || []).map(c => ({ ...c, servedCount: c.servedCount || 0 }));
          setCounters(counters);
          setConnected(true);
        });
        unsubRef.current = unsub;
      } catch (e) {
        console.error(e);
        setConnected(false);
      }
    })();
    return () => {
      mounted = false;
      try { unsubRef.current && unsubRef.current(); } catch { }
    };
  }, []);

  const exportRegistrationsCsv = () => {
    try {
      const list = (showActiveOnly ? counters.filter(c => c.isActive) : counters)
        .map(c => ({ id: c.id, served: c.servedCount || 0, status: c.isActive ? 'Occupied' : 'Available' }))
        .sort((a, b) => a.id - b.id);
      const rows = [
        ['Counter', 'Total Registered', 'Status'],
        ...list.map(r => [`Counter ${r.id}`, String(r.served), r.status])
      ];
      const csv = rows.map(r => r.map(v => {
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',')).join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
      a.href = url;
      a.download = `admin-registrations-${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to export CSV.');
      // eslint-disable-next-line no-console
      console.error(e);
    }
  };

  const reconnect = () => window.location.reload();

  const resetSystem = () => {
    if (confirm('⚠️ Reset entire queue system? This will:\n- Clear all counters\n- Reset queue numbers to 1\n- Clear all data\n\nThis action cannot be undone.')) {
      apiResetSystem().then(() => alert('✅ System has been reset successfully!'));
    }
  };

  const clearCounter = (counterId) => {
    if (confirm(`Clear Counter ${counterId}?`)) {
      apiClearCounter(counterId);
    }
  };

  const callNext = (counterId) => apiCallNext(counterId);

  const clearAllCounters = () => {
    if (confirm('Clear ALL counters?')) {
      counters.forEach(c => apiClearCounter(c.id));
    }
  };

  const handleUpdateCounters = async (e) => {
    e.preventDefault();
    const count = parseInt(newCounterCount, 10);
    if (isNaN(count) || count < 1) {
      alert('Please enter a valid number of counters (at least 1).');
      return;
    }

    if (confirm(`Change total counters to ${count}?`)) {
      try {
        await apiUpdateCounters(count);
        setNewCounterCount('');
        alert('✅ Counters updated successfully!');
      } catch (err) {
        alert('❌ Failed to update counters.');
        console.error(err);
      }
    }
  };

  // Voice announcement removed — no client-side speech

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 p-6">
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
              <p className="text-cyan-200 text-xl mt-2">System Management & Monitoring</p>
            </div>
          </div>

          <div className={`p-4 rounded-lg flex items-center gap-2 ${connected ? 'bg-green-500' : 'bg-red-500'
            } text-white font-semibold`}>
            <span className="text-lg">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Total Served</h3>
              <Activity className="text-cyan-500" size={24} />
            </div>
            <p className="text-4xl font-bold text-blue-600">{stats.totalServed}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Active Counters</h3>
              <Activity className="text-teal-500" size={24} />
            </div>
            <p className="text-4xl font-bold text-green-600">{stats.activeCounters}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Last Served</h3>
              <Activity className="text-cyan-500" size={24} />
            </div>
            <p className="text-4xl font-bold text-purple-600">{stats.servedToday || '-'}</p>
          </div>
        </div>

        {/* System Configuration */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="text-cyan-600" size={32} />
            <h2 className="text-2xl font-bold text-gray-800">System Configuration</h2>
          </div>
          <form onSubmit={handleUpdateCounters} className="flex gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Counters
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={newCounterCount}
                onChange={(e) => setNewCounterCount(e.target.value)}
                placeholder={`Current: ${counters.length}`}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={!connected || !newCounterCount}
              className={`px-8 py-3 rounded-lg font-semibold text-white transition h-[50px] ${connected && newCounterCount
                  ? 'bg-cyan-600 hover:bg-cyan-700'
                  : 'bg-gray-300 cursor-not-allowed'
                }`}
            >
              Update Counter Count
            </button>
          </form>
          <p className="mt-4 text-sm text-gray-500 italic">
            Note: Increasing count adds new counters. Decreasing count removes counters from the end.
          </p>
        </div>

        {/* Admin access: no PIN required in offline mode */}

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={resetSystem}
              disabled={!connected}
              className={`flex items-center justify-center gap-3 py-4 rounded-lg font-semibold text-lg transition ${connected
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            >
              <Trash2 size={24} />
              Reset System
            </button>

            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-3 bg-cyan-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-cyan-700 transition"
            >
              <RefreshCw size={24} />
              Refresh Page
            </button>

            <button
              onClick={clearAllCounters}
              disabled={!connected}
              className={`flex items-center justify-center gap-3 py-4 rounded-lg font-semibold text-lg transition ${connected
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            >
              <Trash2 size={24} />
              Clear All Counters
            </button>

            <button
              onClick={reconnect}
              className="flex items-center justify-center gap-3 bg-slate-800 text-white py-4 rounded-lg font-semibold text-lg hover:bg-black transition"
            >
              <RefreshCcw size={24} />
              Reconnect
            </button>
          </div>
        </div>

        {/* Registrations by Counter */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8 text-gray-800">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Registrations by Counter</h2>
          <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
              />
              Show only active counters
            </label>
            <button
              onClick={exportRegistrationsCsv}
              className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-semibold hover:bg-black transition"
            >
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-gray-600 border-b">
                  <th className="py-3 px-4 font-semibold">Counter</th>
                  <th className="py-3 px-4 font-semibold">Total Registered</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {(showActiveOnly ? counters.filter(c => c.isActive) : counters).map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2 px-4 text-gray-800">Counter {c.id}</td>
                    <td className="py-2 px-4 font-semibold text-gray-800">{c.servedCount || 0}</td>
                    <td className="py-2 px-4 text-gray-800">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {c.isActive ? 'Occupied' : 'Available'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="py-3 px-4 font-bold text-gray-800">Total</td>
                  <td className="py-3 px-4 font-bold text-gray-800">
                    {(showActiveOnly ? counters.filter(c => c.isActive) : counters).reduce((sum, c) => sum + (c.servedCount || 0), 0)}
                  </td>
                  <td className="py-3 px-4" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Counters Grid */}
        <div className="bg-white rounded-xl p-6 shadow-lg text-gray-800">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Counter Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {counters.map((counter) => (
              <div
                key={counter.id}
                className="rounded-xl p-6 text-center transition bg-white shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-semibold">Counter {counter.id}</div>
                  <div className={`w-4 h-4 rounded-full ${counter.isActive ? 'bg-teal-500' : 'bg-gray-300'}`} />
                </div>

                <div className="text-3xl font-bold mb-3 text-gray-800">
                  {counter.isActive ? 'Occupied' : 'Available'}
                </div>

                <div className="text-sm text-gray-700 mb-4 bg-gray-50 rounded p-2">
                  <span className="font-semibold">Total Registered:</span> {counter.servedCount || 0}
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => callNext(counter.id)}
                    disabled={!connected}
                    className={`w-full py-2 rounded-lg transition text-sm font-semibold flex items-center justify-center gap-2 ${connected ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    <PhoneCall size={18} /> Call Next
                  </button>
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

        {/* Share access removed for offline/local-only mode */}

        {/* System Info removed */}
      </div>
    </div>
  );
}