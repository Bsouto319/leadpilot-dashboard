import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [client, setClient]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadClient(data.session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (session) loadClient(session.user.id);
      else { setClient(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadClient(userId: string) {
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

  if (!client) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-center">
      <div>
        <p className="text-gray-500 text-sm">Account not linked to a contractor.</p>
        <button onClick={() => supabase.auth.signOut()} className="mt-3 text-xs text-red-500 hover:underline">Sign out</button>
      </div>
    </div>
  );

  return <Dashboard clientId={client.id} businessName={client.business_name} />;
}
