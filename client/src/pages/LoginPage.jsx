import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { extractError } from '../utils/helpers';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const DEMO = [
  { role:'Driver',  email:'alice@example.com',    password:'password123', color:'linear-gradient(135deg,#22c55e,#16a34a)' },
  { role:'Owner',   email:'owner1@example.com',   password:'password123', color:'linear-gradient(135deg,#3b82f6,#2563eb)' },
  { role:'Manager', email:'testmanager@gmail.com', password:'123456',      color:'linear-gradient(135deg,#f59e0b,#d97706)' },
];

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();
  const from = location.state?.from?.pathname;

  const [form,    setForm]    = useState({ email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  if (user) {
    const dest = user.role==='admin' ? '/admin' : user.role==='owner' ? '/owner' : user.role==='manager' ? '/manager' : '/dashboard';
    navigate(dest, { replace:true });
    return null;
  }

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}!`);
      const dest = from || (u.role==='admin' ? '/admin' : u.role==='owner' ? '/owner' : u.role==='manager' ? '/manager' : '/dashboard');
      navigate(dest, { replace:true });
    } catch (err) { toast.error(extractError(err)); }
    finally { setLoading(false); }
  };

  const fillDemo = (d) => setForm({ email: d.email, password: d.password });

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen flex" style={{ background:'#f8fafc' }}>

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background:'linear-gradient(135deg,#0f0c29 0%,#1e1b4b 40%,#3730a3 80%,#4f46e5 100%)' }}>

        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
            style={{ background:'radial-gradient(circle,#818cf8,transparent)', filter:'blur(60px)' }}/>
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-15"
            style={{ background:'radial-gradient(circle,#60a5fa,transparent)', filter:'blur(60px)' }}/>
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage:'radial-gradient(circle,#ffffff 1px,transparent 1px)', backgroundSize:'28px 28px' }}/>
        </div>

        {/* Logo */}
        <Link to="/" className="relative w-fit">
          <span className="font-brand text-xl text-white">ParkBangla</span>
        </Link>

        {/* Center content */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl mb-8 flex items-center justify-center"
            style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.15)' }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-4 leading-tight">
            Welcome<br/>back.
          </h2>
          <p className="text-white/50 text-base leading-relaxed max-w-xs">
            Sign in to access your parking dashboard, manage reservations and track your vehicles.
          </p>

          {/* Feature list */}
          <div className="mt-10 space-y-3.5">
            {[
              'Real-time parking availability',
              'Instant booking confirmation',
              'Entry & exit tracking',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)' }}>
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <span className="text-sm text-white/60">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative">
          <div className="h-px w-12 mb-4" style={{ background:'rgba(255,255,255,0.2)' }}/>
          <p className="text-xs text-white/30">Trusted by 10,000+ drivers worldwide</p>
        </div>
      </div>

      {/* ── Right panel — Option H: Glassmorphism on Gradient ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden"
        style={{ background:'linear-gradient(135deg,#0f0c29 0%,#1e1b4b 40%,#312e81 70%,#1e40af 100%)' }}>

        {/* Glow orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full pointer-events-none opacity-30"
          style={{ background:'radial-gradient(circle,#818cf8,transparent 65%)', filter:'blur(80px)' }}/>
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none opacity-20"
          style={{ background:'radial-gradient(circle,#60a5fa,transparent 65%)', filter:'blur(70px)' }}/>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage:'radial-gradient(circle,#ffffff 1px,transparent 1px)', backgroundSize:'24px 24px' }}/>

        {/* Mobile logo */}
        <Link to="/" className="lg:hidden absolute top-6 left-6 z-10">
          <span className="font-brand text-xl text-white">ParkBangla</span>
        </Link>

        {/* Glass card */}
        <div className="relative w-full max-w-sm z-10 rounded-3xl p-8"
          style={{
            background:'rgba(255,255,255,0.08)',
            backdropFilter:'blur(24px)',
            WebkitBackdropFilter:'blur(24px)',
            border:'1px solid rgba(255,255,255,0.15)',
            boxShadow:'0 32px 64px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}>

          {/* Header */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-white mb-1.5">Welcome back</h1>
            <p className="text-sm text-white/50">
              No account?{' '}
              <Link to="/register" className="text-indigo-300 font-semibold hover:text-white transition-colors">Create one free</Link>
            </p>
          </div>

          {/* Google */}
          <button type="button" onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl text-sm font-semibold transition-all mb-5 hover:scale-[1.01] active:scale-[.99]"
            style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.18)', color:'#fff' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.16)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; }}>
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.1)' }}/>
            <span className="text-[11px] text-white/30 font-medium">or sign in with email</span>
            <div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.1)' }}/>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1.5">Email address</label>
              <input name="email" type="email" required autoComplete="email"
                placeholder="you@example.com"
                value={form.email} onChange={handle}
                className="w-full px-4 py-3.5 rounded-2xl text-sm text-white placeholder-white/25 outline-none transition-all"
                style={{ background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.12)' }}
                onFocus={e => { e.target.style.borderColor='rgba(129,140,248,0.6)'; e.target.style.background='rgba(255,255,255,0.12)'; e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.2)'; }}
                onBlur={e => { e.target.style.borderColor='rgba(255,255,255,0.12)'; e.target.style.background='rgba(255,255,255,0.08)'; e.target.style.boxShadow='none'; }}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-white/50">Password</label>
                <button type="button" className="text-xs text-indigo-300 font-semibold hover:text-white transition-colors">Forgot?</button>
              </div>
              <div className="relative">
                <input name="password" type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password} onChange={handle}
                  className="w-full px-4 py-3.5 pr-11 rounded-2xl text-sm text-white placeholder-white/25 outline-none transition-all"
                  style={{ background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.12)' }}
                  onFocus={e => { e.target.style.borderColor='rgba(129,140,248,0.6)'; e.target.style.background='rgba(255,255,255,0.12)'; e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.2)'; }}
                  onBlur={e => { e.target.style.borderColor='rgba(255,255,255,0.12)'; e.target.style.background='rgba(255,255,255,0.08)'; e.target.style.boxShadow='none'; }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                  {showPw
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* CTA */}
            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[.99] disabled:opacity-50 mt-1"
              style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)', boxShadow:'0 4px 20px rgba(99,102,241,0.5)' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow='0 8px 28px rgba(99,102,241,0.65)'; e.currentTarget.style.transform='translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow='0 4px 20px rgba(99,102,241,0.5)'; e.currentTarget.style.transform='translateY(0)'; }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.1)' }}/>
            <span className="text-[11px] text-white/30 font-medium">demo accounts</span>
            <div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.1)' }}/>
          </div>

          {/* Demo */}
          <div className="grid grid-cols-3 gap-2">
            {DEMO.map(d => (
              <button key={d.role} onClick={() => fillDemo(d)}
                className="group flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all hover:scale-105 active:scale-95"
                style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: d.color }}>
                  {d.role.charAt(0)}
                </div>
                <span className="text-[11px] font-semibold text-white/40 group-hover:text-white/80 transition-colors">{d.role}</span>
              </button>
            ))}
          </div>

          {/* Legal */}
          <p className="text-center text-[11px] text-white/25 mt-5">
            By signing in you agree to our{' '}
            <Link to="/" className="text-white/40 hover:text-white/70 underline underline-offset-2 transition-colors">Terms</Link> &amp;{' '}
            <Link to="/" className="text-white/40 hover:text-white/70 underline underline-offset-2 transition-colors">Privacy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
