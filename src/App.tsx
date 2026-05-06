import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';

const ADMIN_EMAIL = 'brunosouto1108@gmail.com';

export default function App() {
  const [session, setSession]             = useState<any>(null);
  const [client, setClient]               = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [viewAsClient, setViewAsClient]   = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadClient(data.session.user.id, data.session.user.email);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) loadClient(s.user.id, s.user.email);
      else { setClient(null); setViewAsClient(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadClient(userId: string, email?: string | null) {
    if (email === ADMIN_EMAIL) { setLoading(false); return; }
    const { data } = await supabase.from('clients').select('id, business_name').eq('user_id', userId).single();
    setClient(data);
    setLoading(false);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!session) return <Login />;

  const isAdmin = session.user.email === ADMIN_EMAIL;

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
