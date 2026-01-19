import { useState, useEffect, useRef } from 'react';
import { Monitor, Volume2, WifiOff, Wifi, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import announceTimes, { unlockSpeech, isSpeechAvailable, beepFallback, speechSelfTest } from '../utils/announcer';
import { subscribeState } from '../utils/api';

export default function DisplayScreen() {
  const [counters, setCounters] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [lastAttemptTs, setLastAttemptTs] = useState(null);
  const [soundReady, setSoundReady] = useState(() => {
    try { return localStorage.getItem('soundReady') === '1'; } catch { return false; }
  });
  const [speechSupported, setSpeechSupported] = useState(true);
  const [tvMode, setTvMode] = useState(() => {
    try { return localStorage.getItem('tvMode') === '1'; } catch { return false; }
  });

  const prevCountersRef = useRef(counters);
  const unsubRef = useRef(null);
  // Track last NUMBER_CALLED event timestamp so we announce each call only once (3 repeats inside safeAnnounce)
  const lastAnnouncedEventTsRef = useRef(0);
  // Track in-progress announcement & recent messages to suppress duplicates
  const isAnnouncingRef = useRef(false);
  const lastMsgRef = useRef({ text: '', ts: 0 });


  useEffect(() => {
    // subscribe to realtime state
    if (unsubRef.current) return; // Guard against React StrictMode double effect in dev
    (async () => {
      const unsub = await subscribeState((state) => {
        setLastAttemptTs(Date.now());
        if (!state) {
          setConnected(false);
          setLastError('No state returned');
          return;
        }
        try {
          const inc = state?.counters || [];
          // detect availability transitions
          const prev = prevCountersRef.current || [];
          inc.forEach((c) => {
            const p = prev.find(x => x.id === c.id) || { isActive: false, currentNumber: 0 };
            const wasOccupied = p.isActive && p.currentNumber > 0;
            const nowOccupied = c.isActive && c.currentNumber > 0;
            if (wasOccupied && !nowOccupied) {
              safeAnnounce(`Counter ${c.id} is now available`, 3);
            }
          });
          const ev = state?.lastEvent;
          if (ev?.type === 'NUMBER_CALLED' && ev.counterId) {
            // Only announce if this is a NEW event (unique ts) and not already spoken.
            const eventTs = ev.ts || Date.now();
            if (eventTs !== lastAnnouncedEventTsRef.current) {
              lastAnnouncedEventTsRef.current = eventTs;
              // Announce exactly 3 times.
              safeAnnounce(`Please proceed to counter ${ev.counterId}`, 3);
            }
          }
          prevCountersRef.current = inc;
          setCounters(inc);
          setConnected(true);
          setLastError(null);
        } catch (e) {
          setLastError(e?.message || 'Unknown error');
          setConnected(false);
        }
      });
      unsubRef.current = unsub;
    })();
    // Detect speech availability
    setSpeechSupported(isSpeechAvailable());

    // Unlock speech synthesis on first user interaction (required by some browsers)
    const unlock = async () => {
      try {
        unlockSpeech();
        const ok = await speechSelfTest();
        if (ok) {
          setSoundReady(true);
          try { localStorage.setItem('soundReady', '1'); } catch { }
        }
      } catch { }
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    return () => {
      try { unsubRef.current && unsubRef.current(); } catch { }
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
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
    try { localStorage.setItem('tvMode', next ? '1' : '0'); } catch { }
    // try fullscreen for TV mode
    try {
      if (next) {
        if (document.fullscreenElement == null) {
          await document.documentElement.requestFullscreen();
        }
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch { }
  };

  // Speak or beep fallback depending on availability/unlock state
  const safeAnnounce = async (text, times = 3) => {
    // Suppress if same text announced within last 4 seconds
    const now = Date.now();
    if (lastMsgRef.current.text === text && (now - lastMsgRef.current.ts) < 4000) {
      return;
    }
    // If an announcement currently running, skip (prevents overlap)
    if (isAnnouncingRef.current) return;
    isAnnouncingRef.current = true;
    lastMsgRef.current = { text, ts: now };
    if (!speechSupported || !soundReady) {
      // beep a few times as fallback
      for (let i = 0; i < Math.max(1, times); i++) {
        try { await beepFallback(200, 880, 0.4); } catch { }
        await new Promise(r => setTimeout(r, 200));
      }
      isAnnouncingRef.current = false;
      return;
    }
    try { await announceTimes(text, times, { volume: 1 }); } catch { /* ignore */ }
    isAnnouncingRef.current = false;
  };

  // Announce when NUMBER_CALLED detected via state transitions (handled in subscribe above)

  const handleEnableSound = async () => {
    try {
      unlockSpeech();
      const ok = await speechSelfTest();
      if (ok) {
        setSoundReady(true);
        try { localStorage.setItem('soundReady', '1'); } catch { }
        await announceTimes('Announcements enabled', 1, { volume: 1 });
      } else {
        // if voice still blocked, give a beep to confirm some audio path works
        await beepFallback(200, 880, 0.4);
      }
    } catch { }
  };

  const handleTestVoice = async () => {
    try {
      await announceTimes('Test: voice announcement working', 1, { volume: 1 });
    } catch { }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 p-6 relative">
      <div className="absolute top-4 left-4 z-20">
        <Link to="/" className="bg-white bg-opacity-20 text-white p-3 rounded-lg hover:bg-opacity-30 transition block">
          <Home size={24} />
        </Link>
      </div>

      <div className={`absolute top-4 right-4 p-3 rounded-lg flex items-center gap-2 ${connected ? 'bg-teal-500' : 'bg-rose-500'
        } text-white font-semibold z-20`}>
        {connected ? <Wifi size={20} /> : <WifiOff size={20} />}
        {connected ? 'Connected' : 'Disconnected'}
      </div>
      {!connected && (
        <div className="absolute top-20 right-4 w-80 bg-rose-950/70 border border-rose-700 text-rose-100 rounded-xl p-4 text-sm space-y-2 backdrop-blur z-30">
          <div className="font-semibold">State API Not Reachable</div>
          <p className="text-rose-200">The display cannot read <code className="font-mono">/api/queue/state</code>. This usually means KV isn’t enabled or the functions returned an error.</p>
          {lastError && <p className="text-rose-300">Last error: {lastError}</p>}
          {lastAttemptTs && <p className="text-rose-400">Last attempt: {new Date(lastAttemptTs).toLocaleTimeString()}</p>}
          <ol className="list-decimal ml-4 space-y-1 text-rose-300">
            <li>Open <a href="/api/queue/state" target="_blank" rel="noreferrer" className="underline">/api/queue/state</a> in a new tab.</li>
            <li>If error: go to Vercel Dashboard → Storage → KV → Add Integration.</li>
            <li>Redeploy after KV integration is added.</li>
            <li>Refresh this page.</li>
          </ol>
          <button
            onClick={() => { setLastError(null); setConnected(false); }}
            className="w-full mt-2 bg-rose-700 hover:bg-rose-600 text-white rounded-lg py-2 font-semibold"
          >Dismiss</button>
        </div>
      )}

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
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${soundReady ? 'bg-teal-600 text-white' : 'bg-amber-500 text-black'}`}>
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
          <button onClick={handleEnableSound} className="bg-teal-500 hover:bg-teal-600 text-white font-semibold px-3 py-1 rounded-lg">Enable</button>
          <Link to="/" className="ml-2 underline text-blue-200">Home</Link>
        </div>
      )}
      {speechSupported && soundReady && (
        <div className="fixed bottom-4 right-4 z-30 bg-black/50 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <button onClick={handleTestVoice} className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-2 py-1 rounded">Test Voice</button>
          <button onClick={() => beepFallback()} className="bg-slate-600 hover:bg-slate-700 text-white font-semibold px-2 py-1 rounded">Beep</button>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Monitor size={64} className="text-teal-300" />
            <h1 className="text-6xl font-bold text-white">Queue Display</h1>
            <Volume2 size={64} className="text-cyan-400 animate-pulse" />
          </div>
          <p className="text-cyan-200 text-2xl">Please watch for your number</p>
        </div>

        {/* Dynamic grid layout */}
        <div className={`grid gap-6 ${tvMode ? 'gap-5' : 'gap-6'} grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`}>
          {counters.map((counter) => {
            const isOccupied = counter.isActive && counter.currentNumber > 0;
            return (
              <div key={counter.id} className="rounded-2xl p-6 text-center bg-white/5">
                <div className="text-xl font-semibold mb-3 text-white">Counter {counter.id}</div>
                <div className="flex items-center justify-center">
                  <div className={`w-28 h-28 rounded-full shadow-lg transition-colors ${isOccupied ? 'bg-rose-500 blink' : 'bg-teal-500'}`} />
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