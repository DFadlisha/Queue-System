import { useState, useEffect, useRef } from 'react';
import { Monitor, Volume2, WifiOff, Wifi, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import announceTimes from '../utils/announcer';

const WS_URL = `ws://${window.location.hostname}:3001`;

export default function DisplayScreen() {
  const [counters, setCounters] = useState(
    Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      currentNumber: 0,
      isActive: false
    }))
  );
  const [connected, setConnected] = useState(false);
  
  const wsRef = useRef(null);
  const prevCountersRef = useRef(counters);
  

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
          // Server provides updated counters; we rely on isActive for color display
          // handle transitions here as well
          const incomingCall = message.data.counters;
          const prevCall = prevCountersRef.current || [];
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
        // ANNOUNCE removed — voice disabled
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

    // announcer functionality removed — display is visual-only

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
        {connected ? 'Live' : 'Disconnected'}
      </div>

      {/* Announcer UI removed — voice disabled */}

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Monitor size={64} className="text-white" />
            <h1 className="text-6xl font-bold text-white">Queue Display</h1>
            <Volume2 size={64} className="text-green-400 animate-pulse" />
          </div>
          <p className="text-blue-200 text-2xl">Please watch for your number</p>
        </div>

        <div className="grid grid-cols-5 gap-6 mb-8">
          {counters.map((counter) => {
            const isOccupied = counter.isActive && counter.currentNumber > 0;
            return (
              <div key={counter.id} className="rounded-2xl p-6 text-center">
                <div className="text-xl font-semibold mb-3 text-white">Counter {counter.id}</div>
                <div className="flex items-center justify-center">
                  {/* colour indicator: green when empty, red when occupied */}
                  <div className={`w-28 h-28 rounded-full shadow-lg transition-colors ${
                    isOccupied ? 'bg-red-500' : 'bg-green-500'
                  }`} />
                </div>
                <div className="mt-3 text-sm text-blue-200">
                  {isOccupied ? 'Occupied' : 'Available'}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white bg-opacity-10 rounded-2xl p-8 backdrop-blur-sm">
          <h2 className="text-white text-3xl font-bold text-center mb-6">
            🎯 Currently Serving
          </h2>
          <div className="grid grid-cols-5 gap-4">
            {counters.filter(c => c.isActive).map((counter) => (
              <div key={counter.id} className="bg-yellow-500 rounded-xl p-4 text-center animate-pulse">
                <div className="text-white text-xl font-bold">Counter {counter.id}</div>
                <div className="text-yellow-100 text-sm">Occupied</div>
              </div>
            ))}
            {counters.filter(c => c.isActive).length === 0 && (
              <div className="col-span-5 text-center text-white text-xl py-4">
                No active counters at the moment
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-6 text-center">
          <p className="text-white text-2xl font-semibold">
            📢 Please proceed to your counter when your number is called
          </p>
        </div>

        <div className="mt-6 text-center text-blue-200 text-lg">
          <p>� Voice announcements disabled • Watch this screen for visual updates</p>
        </div>
      </div>
    </div>
  );
}