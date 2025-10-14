import { useState, useEffect, useRef } from 'react';
import { Monitor, Volume2, WifiOff, Wifi, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import announceTimes, { unlockSpeech, isSpeechAvailable, beepFallback, speechSelfTest } from '../utils/announcer';

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
    return override.replace(/\/$/, ''); // strip trailing slash
  }
  if (isDev) return `ws://${host}:3001`;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const hostport = location.host; // includes port if present
  return `${proto}://${hostport}`;
})();
const WS_URL = `${WS_BASE}/ws`;

export default function DisplayScreen() {
  const [counters, setCounters] = useState(
    Array.from({ length: 8 }, (_, i) => ({
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
  const [tvMode, setTvMode] = useState(() => {
    try { return localStorage.getItem('tvMode') === '1'; } catch { return false; }
  });
  
  const wsRef = useRef(null);
  const retryDelayRef = useRef(500); // start fast, then back off up to 5s
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
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('pointerdown', unlock, { passive: true });
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('pointerdown', unlock);
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === 't') {
        toggleTvMode();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleTvMode = async () => {
    const next = !tvMode;
    setTvMode(next);
    try { localStorage.setItem('tvMode', next ? '1' : '0'); } catch {}
    // try fullscreen for TV mode
    try {
      if (next) {
        if (document.fullscreenElement == null) {
          await document.documentElement.requestFullscreen();
        }
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {}
  };

  // Speak or beep fallback depending on availability/unlock state
  const safeAnnounce = async (text, times = 3) => {
    if (!speechSupported || !soundReady) {
      // beep a few times as fallback
      for (let i = 0; i < Math.max(1, times); i++) {
        try { await beepFallback(200, 880, 0.4); } catch {}
        await new Promise(r => setTimeout(r, 200));
      }
      return;
    }
    try { await announceTimes(text, times, { volume: 1 }); } catch { /* ignore */ }
  };

  const connectWebSocket = () => {
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('Connected to server');
      setConnected(true);
      retryDelayRef.current = 500; // reset backoff on success
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
              // counter became available -> announce or beep 3 times
              safeAnnounce(`Counter ${c.id} is now available`, 3);
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
            safeAnnounce(`Please proceed to counter ${calledId}`, 3);
          }
          incomingCall.forEach((c) => {
            const p = prevCall.find(x => x.id === c.id) || { isActive: false, currentNumber: 0 };
            const wasOccupied = p.isActive && p.currentNumber > 0;
            const nowOccupied = c.isActive && c.currentNumber > 0;
            if (wasOccupied && !nowOccupied) {
              safeAnnounce(`Counter ${c.id} is now available`, 3);
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

      {/* TV Mode toggle */}
      <div className="absolute top-4 right-40 p-3 rounded-lg bg-black/40 text-white font-semibold z-20 cursor-pointer select-none"
           onClick={toggleTvMode}
           title="Toggle TV Mode (fullscreen). Shortcut: T">
        {tvMode ? 'TV Mode: On' : 'TV Mode: Off'}
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

        {/* Even grid layout: 4 columns x 2 rows for 8 counters */}
        <div className={`grid gap-6 ${tvMode ? 'gap-5' : 'gap-6'} grid-cols-2 md:grid-cols-4`}>
          {counters.map((counter) => {
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
          })}
        </div>

  {/* Footer note removed: voice announcements are enabled */}
      </div>
    </div>
  );
}