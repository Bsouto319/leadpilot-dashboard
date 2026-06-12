import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Login, { ResetPassword } from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import BusinessCard from './pages/BusinessCard';

export default function App() {
  // Public routes — no auth required
  const path = window.location.pathname;
  const cardMatch = path.match(/^\/card\/([a-z0-9\-]+)$/i);
  if (cardMatch) return <BusinessCard slug={cardMatch[1]} />;

  const [session, setSession]             = useState<any>(null);
  const [client, setClient]               = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [viewAsClient, setViewAsClient]   = useState<any>(null);
  const [isRecovery, setIsRecovery]       = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadClient(data.session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        setSession(s);
        setLoading(false);
        return;
      }
      setSession(s);
      if (s) loadClient(s.user);
      else { setClient(null); setViewAsClient(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadClient(user: any) {
    // role=admin is set server-side via Supabase service role on app_metadata
    // — it is part of the signed JWT and cannot be forged by the browser
    if (user.app_metadata?.role === 'admin') { setLoading(false); return; }
    const { data } = await supabase.from('clients').select('id, business_name').eq('user_id', user.id).single();
    setClient(data);
    setLoading(false);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (isRecovery) return <ResetPassword onDone={() => { setIsRecovery(false); supabase.auth.signOut(); }} />;

  if (!session) return <Login />;

  const isAdmin = session.user.app_metadata?.role === 'admin';

  if (isAdmin) {
    if (viewAsClient) {
      return (
        <Dashboard
          clientId={viewAsClient.id}
          businessName={viewAsClient.business_name}
          userEmail={session.user.email}
          onBack={() => setViewAsClient(null)}
        />
      );
    }
    return <AdminPanel onViewClient={setViewAsClient} />;
  }

  if (!client) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-center p-4">
      <div>
        <p className="text-gray-500 text-sm">Account not linked to a contractor.</p>
        <button onClick={() => supabase.auth.signOut()} className="mt-3 text-xs text-red-500 hover:underline">Sign out</button>
      </div>
    </div>
  );

  return (
    <Dashboard
      clientId={client.id}
      businessName={client.business_name}
      userEmail={session.user.email}
    />
  );
}
