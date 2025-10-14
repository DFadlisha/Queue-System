import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Smartphone, Monitor, Settings } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  // Auto-redirect when provided a role parameter in the link, e.g. ?role=display|counter|admin
  // This lets you share one link per role that opens the correct page automatically.
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const role = (params.get('role') || '').toLowerCase();
      if (role === 'display') navigate('/display', { replace: true });
      else if (role === 'counter') navigate('/counter', { replace: true });
      else if (role === 'admin') navigate('/admin', { replace: true });
    } catch {}
  }, [navigate]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4">
            Queue Management System
          </h1>
          <p className="text-2xl text-blue-200">
            Select your interface
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Counter Phone */}
          <Link 
            to="/counter" 
            className="bg-gradient-to-br from-blue-500 to-blue-700 p-8 rounded-2xl text-white hover:scale-105 transition transform shadow-2xl"
          >
            <Smartphone className="mx-auto mb-4" size={64} />
            <h2 className="text-3xl font-bold text-center mb-2">
              Counter Phone
            </h2>
            <p className="text-center text-lg">
              For staff to call customers
            </p>
          </Link>

          {/* Display Screen */}
          <Link 
            to="/display" 
            className="bg-gradient-to-br from-green-500 to-green-700 p-8 rounded-2xl text-white hover:scale-105 transition transform shadow-2xl"
          >
            <Monitor className="mx-auto mb-4" size={64} />
            <h2 className="text-3xl font-bold text-center mb-2">
              Display Screen
            </h2>
            <p className="text-center text-lg">
              For customers to watch queue status (colour indicators only)
            </p>
          </Link>

          {/* Admin Panel */}
          <Link 
            to="/admin" 
            className="bg-gradient-to-br from-purple-500 to-pink-600 p-8 rounded-2xl text-white hover:scale-105 transition transform shadow-2xl"
          >
            <Settings className="mx-auto mb-4" size={64} />
            <h2 className="text-3xl font-bold text-center mb-2">
              Admin Panel
            </h2>
            <p className="text-center text-lg">
              System management & monitoring
            </p>
          </Link>
        </div>

        <div className="mt-12 bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 text-white">
          <h3 className="text-2xl font-bold mb-4 text-center">📱 Quick Setup</h3>
          <ul className="space-y-2 text-lg">
            <li>📱 <strong>Staff:</strong> Open Counter Phone on staff devices</li>
            <li>🖥️ <strong>Display:</strong> Open Display Screen on TV/monitor</li>
            <li>⚙️ <strong>Manager:</strong> Open Admin Panel for control</li>
          </ul>
        </div>
      </div>
    </div>
  );
}