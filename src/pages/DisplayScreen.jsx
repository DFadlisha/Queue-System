import { useState, useEffect, useRef } from 'react';
import { Monitor, Volume2, WifiOff, Wifi, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import announceTimes, { unlockSpeech, isSpeechAvailable, beepFallback, speechSelfTest } from '../utils/announcer';

const isDev = import.meta && import.meta.env && import.meta.env.DEV;
const WS_URL = isDev
  ? `ws://${window.location.hostname}:3001`
  : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

export default function DisplayScreen() {
  const [counters, setCounters] = useState(
    Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      currentNumber: 0,
      isActive: false
    }))
  );
  const [connected, setConnected] = useState(false);
  const [soundReady, setSoundReady] = useState(() => {
    try { return localStorage.getItem('soundReady') === '1'; } catch { return false; }
  });
  const [speechSupported, setSpeechSupported] = useState(true);
  
  const wsRef = useRef(null);
  const prevCountersRef = useRef(counters);
  

  useEffect(() => {
    connectWebSocket();
    // Detect speech availability
    setSpeechSupported(isSpeechAvailable());

    // Unlock speech synthesis on first user interaction (required by some browsers)
    const unlock = () => {
      try {
        unlockSpeech();
        setSoundReady(true);
        try { localStorage.setItem('soundReady', '1'); } catch {}
      } catch (e) {}
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock, { passive: true });
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

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
          // compare with previous state to detect transitions
          const incoming = message.data.counters;
          const prev = prevCountersRef.current || [];

          // find counters that became available: previously occupied (isActive && currentNumber>0) -> now not occupied
          incoming.forEach((c) => {
            const p = prev.find(x => x.id === c.id) || { isActive: false, currentNumber: 0 };
            const wasOccupied = p.isActive && p.currentNumber > 0;
            const nowOccupied = c.isActive && c.currentNumber > 0;
            if (wasOccupied && !nowOccupied) {
              // counter became available -> speak announcement 3 times
              try {
                announceTimes(`Counter ${c.id} is now available`, 3);
              } catch (e) {
                // swallow errors from speech API
                console.warn('Announce failed', e);
              }
            }
          });

          prevCountersRef.current = incoming;
          setCounters(incoming);
          break;
        case 'NUMBER_CALLED':
          // Announce which counter is calling next and update state
          const incomingCall = message.data.counters;
          const prevCall = prevCountersRef.current || [];
          // find the counter that initiated the call (if provided)
          const calledId = message.data.counterId;
          if (calledId) {
            try { announceTimes(`Please proceed to counter ${calledId}`, 3); } catch (e) { }
          }
          incomingCall.forEach((c) => {
            const p = prevCall.find(x => x.id === c.id) || { isActive: false, currentNumber: 0 };
            const wasOccupied = p.isActive && p.currentNumber > 0;
            const nowOccupied = c.isActive && c.currentNumber > 0;
            if (wasOccupied && !nowOccupied) {
              try { announceTimes(`Counter ${c.id} is now available`, 3); } catch (e) { }
            }
          });
          prevCountersRef.current = incomingCall;
          setCounters(incomingCall);
          break;
        case 'COUNTER_CLEARED':
          // when a counter is cleared it becomes available -> announce
          const cleared = message.data.counters;
          const prevCleared = prevCountersRef.current || [];
          cleared.forEach((c) => {
            const p = prevCleared.find(x => x.id === c.id) || { isActive: false, currentNumber: 0 };
            const wasOccupied = p.isActive && p.currentNumber > 0;
            const nowOccupied = c.isActive && c.currentNumber > 0;
            if (wasOccupied && !nowOccupied) {
              try { announceTimes(`Counter ${c.id} is now available`, 3); } catch (e) { }
            }
          });
          prevCountersRef.current = cleared;
          setCounters(cleared);
          break;
        case 'SYSTEM_RESET':
          prevCountersRef.current = message.data.counters;
          setCounters(message.data.counters);
          break;
        case 'COUNTER_STATUS_UPDATED':
          prevCountersRef.current = message.data.counters;
          setCounters(message.data.counters);
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

  const handleEnableSound = async () => {
    try {
      unlockSpeech();
      setSoundReady(true);
      try { localStorage.setItem('soundReady', '1'); } catch {}
      await announceTimes('Announcements enabled', 1, { volume: 1 });
    } catch {}
  };

  const handleTestVoice = async () => {
    try {
      await announceTimes('Test: voice announcement working', 1, { volume: 1 });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 p-6 relative">
      <div className="absolute top-4 left-4 z-20">
        <Link to="/" className="bg-white bg-opacity-20 text-white p-3 rounded-lg hover:bg-opacity-30 transition block">
          <Home size={24} />
        </Link>
      </div>

      <div className={`absolute top-4 right-4 p-3 rounded-lg flex items-center gap-2 ${
        connected ? 'bg-green-500' : 'bg-red-500'
      } text-white font-semibold z-20`}>
        {connected ? <Wifi size={20} /> : <WifiOff size={20} />}
        {connected ? 'Connected' : 'Disconnected'}
      </div>

      {/* Voice announcements enabled on events */}

      {/* Sound small status chip */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        {speechSupported ? (
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${soundReady ? 'bg-green-600 text-white' : 'bg-yellow-500 text-black'}`}>
            {soundReady ? 'Sound: Ready' : 'Sound: Tap Enable'}
          </div>
        ) : (
          <div className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-500 text-white">Sound: Unavailable</div>
        )}
      </div>

      {/* Sound enable banner */}
      {speechSupported && !soundReady && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-black/70 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
          <span>Click to enable voice announcements</span>
          <button onClick={handleEnableSound} className="bg-green-500 hover:bg-green-600 text-white font-semibold px-3 py-1 rounded-lg">Enable</button>
          <Link to="/" className="ml-2 underline text-blue-200">Home</Link>
        </div>
      )}
      {speechSupported && soundReady && (
        <div className="fixed bottom-4 right-4 z-30 bg-black/50 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <button onClick={handleTestVoice} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-2 py-1 rounded">Test Voice</button>
          <button onClick={() => beepFallback()} className="bg-gray-500 hover:bg-gray-600 text-white font-semibold px-2 py-1 rounded">Beep</button>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Monitor size={64} className="text-white" />
            <h1 className="text-6xl font-bold text-white">Queue Display</h1>
            <Volume2 size={64} className="text-green-400 animate-pulse" />
          </div>
          <p className="text-blue-200 text-2xl">Please watch for your number</p>
        </div>

        {/* L-Shape Layout (true alphabet L):
            - Left vertical bar: counters 1–6 (full height)
            - Bottom horizontal bar: counters 7–10 (full width)
            - Top-right: info panel fills remaining space
        */}
        {(() => {
          const leftColumn = counters.slice(0, 6);
          const bottomRow = counters.slice(6);
          const Tile = ({ counter }) => {
            const isOccupied = counter.isActive && counter.currentNumber > 0;
            return (
              <div key={counter.id} className="rounded-2xl p-6 text-center bg-white/5">
                <div className="text-xl font-semibold mb-3 text-white">Counter {counter.id}</div>
                <div className="flex items-center justify-center">
                  <div className={`w-28 h-28 rounded-full shadow-lg transition-colors ${isOccupied ? 'bg-red-500' : 'bg-green-500'}`} />
                </div>
                <div className="mt-3 text-sm text-blue-200">
                  {isOccupied ? 'Occupied' : 'Available'}
                </div>
              </div>
            );
          };

          return (
            <div className="flex flex-col gap-8 max-h-[70vh] overflow-auto pr-2">
              {/* Main grid: left column + top-right info, then bottom row spanning full width */}
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] gap-6 items-start">
                {/* Left vertical bar (counters 1–6) */}
                <div className="flex flex-col gap-6 xl:self-start">
                  {leftColumn.map(c => <Tile key={c.id} counter={c} />)}
                </div>

                {/* Top-right info panel */}
                <div className="space-y-6">
                  <div className="bg-white bg-opacity-10 rounded-2xl p-8 backdrop-blur-sm">
                    <h2 className="text-white text-3xl font-bold mb-6">🎯 Currently Serving</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {counters.filter(c => c.isActive).map((counter) => (
                        <div key={counter.id} className="bg-yellow-500 rounded-xl p-4 text-center animate-pulse">
                          <div className="text-white text-xl font-bold">Counter {counter.id}</div>
                          <div className="text-yellow-100 text-sm">Occupied</div>
                        </div>
                      ))}
                      {counters.filter(c => c.isActive).length === 0 && (
                        <div className="col-span-full text-center text-white text-xl py-4">
                          No active counters at the moment
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-6 text-center">
                    <p className="text-white text-2xl font-semibold">
                      📢 Please proceed to your counter when your number is called
                    </p>
                  </div>
                </div>

                {/* Bottom horizontal bar (counters 7–10) spanning both columns */}
                <div className="col-span-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {bottomRow.map(c => <Tile key={c.id} counter={c} />)}
                </div>
              </div>
            </div>
          );
        })()}

  {/* Footer note removed: voice announcements are enabled */}
      </div>
    </div>
  );
}