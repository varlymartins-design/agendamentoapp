import { useState, useEffect, useCallback } from 'react';
import { db, syncFromServer, initRealtimeSync, prewarmCache, safeGetItem } from './db';
import { Salon, Appointment } from './types';
import AdminSaaS from './components/AdminSaaS';
import SalonDashboard from './components/SalonDashboard';
import BookingPage from './components/BookingPage';

type Persona = 'loading' | 'admin' | 'salon' | 'client';

function getInitialPersona(): Persona {
  const params = new URLSearchParams(window.location.search);
  if (params.has('salonId') || params.has('token')) return 'client';
  const session = localStorage.getItem('ca_session');
  if (session) {
    try {
      const s = JSON.parse(session);
      if (s.role === 'admin') return 'admin';
      if (s.role === 'salon') return 'salon';
    } catch {}
  }
  return 'loading';
}

export default function App() {
  const [persona, setPersona] = useState<Persona>(() => getInitialPersona());
  const [dbSynced, setDbSynced] = useState(true); // Start as true — show login immediately
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [currentSalonId, setCurrentSalonId] = useState<string | null>(null);
  const [clientSalonId, setClientSalonId] = useState<string | null>(null);

  const triggerRefresh = useCallback(() => setRefreshCounter(c => c + 1), []);

  // Boot
  useEffect(() => {
    // Safety timeout — show login after 4s even if Firebase is slow/blocked
    const safetyTimer = setTimeout(() => {
      setDbSynced(true);
    }, 4000);

    (async () => {
      await prewarmCache();

      // Resolve salon from URL immediately (no need to wait for Firebase)
      const params = new URLSearchParams(window.location.search);
      const salonId = params.get('salonId') || params.get('token');
      if (salonId) {
        setClientSalonId(salonId);
        setPersona('client');
      }

      // Restore salon session immediately from localStorage
      const session = localStorage.getItem('ca_session');
      if (session) {
        try {
          const s = JSON.parse(session);
          if (s.role === 'salon' && s.salonId) setCurrentSalonId(s.salonId);
        } catch {}
      }

      // Try Firebase sync (non-blocking)
      try {
        await Promise.race([
          syncFromServer(),
          new Promise(resolve => setTimeout(resolve, 3000))
        ]);
      } catch {}

      try { initRealtimeSync(); } catch {}
      clearTimeout(safetyTimer);
      setDbSynced(true);
    })();

    return () => clearTimeout(safetyTimer);
  }, []);

  // Listen for db changes
  useEffect(() => {
    const handler = () => triggerRefresh();
    window.addEventListener('db_changed', handler);
    return () => window.removeEventListener('db_changed', handler);
  }, [triggerRefresh]);

  function handleLogin(role: 'admin' | 'salon', salonId?: string) {
    localStorage.setItem('ca_session', JSON.stringify({ role, salonId }));
    if (role === 'salon' && salonId) setCurrentSalonId(salonId);
    setPersona(role);
  }

  function handleLogout() {
    localStorage.removeItem('ca_session');
    setCurrentSalonId(null);
    setPersona('loading');
    window.history.replaceState({}, '', window.location.pathname);
  }

  if (!dbSynced || persona === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg">✂️</div>
        <p className="text-neutral-400 text-sm animate-pulse">Carregando Central de Agendamento...</p>
        {!dbSynced && (
          <div className="mt-6 w-72 space-y-3">
            <LoginForm onLogin={handleLogin} />
          </div>
        )}
      </div>
    );
  }

  if (persona === 'client' && clientSalonId) {
    return <BookingPage salonId={clientSalonId} refreshCounter={refreshCounter} />;
  }

  if (persona === 'salon' && currentSalonId) {
    return (
      <SalonDashboard
        salonId={currentSalonId}
        onLogout={handleLogout}
        refreshCounter={refreshCounter}
        onRefresh={triggerRefresh}
      />
    );
  }

  if (persona === 'admin') {
    return (
      <AdminSaaS
        onLogout={handleLogout}
        refreshCounter={refreshCounter}
        onRefresh={triggerRefresh}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-6 p-4">
      <div className="text-center mb-2">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-4xl shadow-xl mx-auto mb-4">✂️</div>
        <h1 className="text-2xl font-black text-white">Central de Agendamento</h1>
        <p className="text-neutral-400 text-sm mt-1">Sistema para salões de beleza</p>
      </div>
      <div className="w-full max-w-sm">
        <LoginForm onLogin={handleLogin} />
      </div>
    </div>
  );
}

function LoginForm({ onLogin }: { onLogin: (role: 'admin' | 'salon', salonId?: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit() {
    setError('');
    setLoading(true);
    // Admin login
    if (email === 'admin@central.com' && password === 'admin123') {
      onLogin('admin');
      setLoading(false);
      return;
    }
    // Salon login
    const salons = db.getSalons();
    const salon = salons.find(s => s.email === email && s.password === password);
    if (salon) {
      if (salon.subscription_status === 'suspended') {
        setError('Conta suspensa. Contate o suporte.');
        setLoading(false);
        return;
      }
      onLogin('salon', salon.id);
    } else {
      setError('E-mail ou senha incorretos.');
    }
    setLoading(false);
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
      <h2 className="text-white font-bold text-center text-lg">Entrar</h2>
      <div>
        <label className="text-xs text-neutral-400 uppercase font-bold block mb-1">E-mail</label>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-pink-500 transition"
        />
      </div>
      <div>
        <label className="text-xs text-neutral-400 uppercase font-bold block mb-1">Senha</label>
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="••••••"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-pink-500 transition"
        />
      </div>
      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
      <button
        onClick={handleSubmit} disabled={loading}
        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black py-3 rounded-xl text-sm active:scale-95 transition disabled:opacity-50"
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
      <p className="text-neutral-600 text-[10px] text-center">Admin: admin@central.com / admin123</p>
    </div>
  );
}
