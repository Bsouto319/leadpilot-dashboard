import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);

  const inp = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    setDone(true);
    setLoading(false);
    setTimeout(onDone, 2000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/30 mb-4">
            <span className="text-white text-2xl font-black">L</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">LeadPilot</h1>
          <p className="text-slate-500 text-sm mt-1">AI Lead Automation</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-slate-200/60 border border-white p-7">
          {done ? (
            <div className="text-center space-y-3 py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <span className="text-emerald-600 text-xl">✓</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Password updated!</h2>
              <p className="text-sm text-slate-500">Redirecting to your dashboard…</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-slate-900 mb-0.5">Set New Password</h2>
              <p className="text-sm text-slate-500 mb-6">Choose a new password for your account.</p>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={inp} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" className={inp} required />
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl">{error}</p>}
                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition shadow-lg shadow-blue-500/25 disabled:opacity-50 mt-2">
                  {loading ? 'Updating…' : 'Update Password →'}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">Powered by LeadPilot · BTechSouto</p>
      </div>
    </div>
  );
}

export default function Login() {
  const [mode, setMode]           = useState<'login' | 'forgot'>('login');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://leadpilot.contatobtech.com.br',
    });
    if (error) setError(error.message);
    else setForgotSent(true);
    setLoading(false);
  }

  const inp = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in-up">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/30 mb-4">
            <span className="text-white text-2xl font-black">L</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">LeadPilot</h1>
          <p className="text-slate-500 text-sm mt-1">AI Lead Automation</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-slate-200/60 border border-white p-7">

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <>
              <h2 className="text-lg font-bold text-slate-900 mb-0.5">Welcome back</h2>
              <p className="text-sm text-slate-500 mb-6">Sign in to your dashboard</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className={inp} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={inp} required />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition shadow-lg shadow-blue-500/25 disabled:opacity-50 mt-2"
                >
                  {loading ? 'Signing in…' : 'Sign In →'}
                </button>
              </form>

              <button
                onClick={() => { setMode('forgot'); setError(''); }}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-4 transition"
              >
                Forgot password?
              </button>
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === 'forgot' && !forgotSent && (
            <>
              <h2 className="text-lg font-bold text-slate-900 mb-0.5">Reset Password</h2>
              <p className="text-sm text-slate-500 mb-6">We'll send a link to your email.</p>

              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className={inp} required />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition shadow-lg shadow-blue-500/25 disabled:opacity-50"
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>

              <button onClick={() => { setMode('login'); setError(''); }} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-4 transition">
                ← Back to sign in
              </button>
            </>
          )}

          {/* ── SENT ── */}
          {mode === 'forgot' && forgotSent && (
            <div className="text-center space-y-3 py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <span className="text-emerald-600 text-xl">✓</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Check your email</h2>
              <p className="text-sm text-slate-500">We sent a reset link to <strong>{email}</strong>.</p>
              <button onClick={() => { setMode('login'); setForgotSent(false); }} className="text-xs text-blue-500 hover:underline mt-2">
                Back to sign in
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">Powered by LeadPilot · BTechSouto</p>
      </div>
    </div>
  );
}
