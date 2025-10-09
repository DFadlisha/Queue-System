import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CounterPhone from './pages/CounterPhone';
import DisplayScreen from './pages/DisplayScreen';
import Admin from './pages/Admin';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/counter" element={<CounterPhone />} />
        <Route path="/display" element={<DisplayScreen />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}