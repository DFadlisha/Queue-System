import { useState, useEffect, useRef } from 'react';
import { Smartphone, PhoneCall, WifiOff, Wifi, Home, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { subscribeState, callNext as apiCallNext, clearCounter as apiClearCounter, setStatus as apiSetStatus } from '../utils/api';

export default function CounterPhone() {
  const [selectedCounter, setSelectedCounter] = useState(null);
  const [currentNumber, setCurrentNumber] = useState(0);
  const [connected, setConnected] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [counters, setCounters] = useState([]);
  const unsubRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const unsub = await subscribeState((state) => {
        const counters = state?.counters || [];
        if (!mounted) return;
        if (selectedCounter) {
          const counter = counters.find(c => c.id === selectedCounter);
          if (counter) {
            setCurrentNumber(counter.currentNumber);
            setIsActive(!!counter.isActive);
          }
        }
        setCounters(counters);
        setConnected(true);
      });
      unsubRef.current = unsub;
    })();
    return () => { try { unsubRef.current && unsubRef.current(); } catch { }; mounted = false; };
  }, [selectedCounter]);

  const callNext = () => {
    apiCallNext(selectedCounter);

    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
  };

  const clearCounter = () => {
    apiClearCounter(selectedCounter);
  };

  const toggleStatus = () => {
    apiSetStatus(selectedCounter, !isActive);
  };

  if (!selectedCounter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-700 to-cyan-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <Link to="/" className="bg-white bg-opacity-20 text-white p-3 rounded-lg hover:bg-opacity-30 transition">
              <Home size={24} />
            </Link>
            <div className={`p-3 rounded-lg flex items-center gap-2 ${connected ? 'bg-green-500' : 'bg-red-500'
              } text-white font-semibold`}>
              {connected ? <Wifi size={20} /> : <WifiOff size={20} />}
              {connected ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          <div className="text-center mb-8">
            <Smartphone className="mx-auto mb-4 text-teal-200" size={64} />
            <h1 className="text-4xl font-bold text-white mb-2">Counter Phone</h1>
            <p className="text-blue-100 text-xl">Select your counter number</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              🔒 Staff Only Access
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {counters.length > 0 ? (
                counters.map((counter) => (
                  <button
                    key={counter.id}
                    onClick={() => setSelectedCounter(counter.id)}
                    disabled={!connected}
                    className={`py-8 px-6 rounded-xl transition text-3xl font-bold shadow-lg active:scale-95 ${connected
                        ? 'bg-gradient-to-br from-cyan-600 to-cyan-800 text-white hover:from-cyan-700 hover:to-cyan-900'
                        : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      }`}
                  >
                    {counter.id}
                  </button>
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-gray-500 italic">
                  Loading counters...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-700 to-teal-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setSelectedCounter(null)}
            className="text-white text-xl flex items-center gap-2 hover:underline"
          >
            ← Change Counter
          </button>
          <div className={`p-3 rounded-lg flex items-center gap-2 ${connected ? 'bg-teal-700' : 'bg-rose-500'
            } text-white font-semibold`}>
            {connected ? <Wifi size={20} /> : <WifiOff size={20} />}
            {connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-8 text-center">
            <Smartphone className="mx-auto mb-3" size={48} />
            <h1 className="text-5xl font-bold">Counter {selectedCounter}</h1>
            <p className="text-green-100 text-xl mt-2">Staff Terminal</p>
          </div>

          <div className="p-12">
            <div className="text-center mb-10">
              <p className="text-gray-600 text-3xl mb-4">Currently Serving</p>
              <div className={`rounded-2xl p-12 ${currentNumber > 0
                  ? 'bg-gradient-to-br from-teal-500 to-teal-700'
                  : 'bg-gray-200'
                }`}>
                <div className={`text-9xl font-bold ${currentNumber > 0 ? 'text-white' : 'text-gray-400'
                  }`}>
                  {currentNumber || '-'}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={callNext}
                disabled={!connected}
                className={`w-full py-8 rounded-2xl transition text-3xl font-bold shadow-xl flex items-center justify-center gap-3 active:scale-95 ${connected
                    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700'
                    : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  }`}
              >
                <PhoneCall size={36} />
                Call Next Customer
              </button>

              <button
                onClick={clearCounter}
                disabled={!connected}
                className={`w-full py-6 rounded-2xl transition text-2xl font-semibold flex items-center justify-center gap-3 active:scale-95 ${connected
                    ? 'bg-slate-500 text-white hover:bg-slate-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                <X size={32} />
                Clear Counter
              </button>

              <button
                onClick={toggleStatus}
                disabled={!connected}
                className={`w-full py-6 rounded-2xl transition text-2xl font-semibold flex items-center justify-center gap-3 active:scale-95 ${connected
                    ? (isActive ? 'bg-teal-500 text-white hover:bg-teal-600' : 'bg-rose-500 text-white hover:bg-rose-600')
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                {isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                {isActive ? 'Mark Available' : 'Mark Occupied'}
              </button>
            </div>

            <div className="mt-8 pt-8 border-t-2 border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-cyan-50 rounded-xl p-4">
                  <p className="text-gray-600 text-lg">Status</p>
                  <p className="text-cyan-600 text-4xl font-bold">{isActive ? 'Occupied' : 'Available'}</p>
                </div>
                <div className="bg-teal-50 rounded-xl p-4">
                  <p className="text-gray-600 text-lg">Your Counter</p>
                  <p className="text-teal-600 text-4xl font-bold">{selectedCounter}</p>
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