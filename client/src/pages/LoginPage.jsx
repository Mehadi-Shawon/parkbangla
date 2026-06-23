import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { extractError } from '../utils/helpers';
import toast from 'react-hot-toast';

const DEMO = [
  { role:'Driver',  email:'alice@example.com',  password:'password123', color:'linear-gradient(135deg,#22c55e,#16a34a)' },
  { role:'Owner',   email:'owner1@example.com', password:'password123', color:'linear-gradient(135deg,#3b82f6,#2563eb)' },
  { role:'Admin',   email:'admin@parkeasy.com', password:'password123', color:'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
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
        <Link to="/" className="relative flex items-center gap-2.5 w-fit">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)' }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <span className="text-base font-extrabold text-white">ParkBangla</span>
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

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">

        {/* Mobile logo */}
        <Link to="/" className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            </svg>
          </div>
          <span className="text-sm font-extrabold text-gray-900">ParkBangla</span>
        </Link>

        <div className="w-full max-w-sm">

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1.5">Sign in to your account</h1>
            <p className="text-sm text-gray-400">
              New here?{' '}
              <Link to="/register" className="text-indigo-600 font-semibold hover:underline">Create a free account</Link>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
              <input name="email" type="email" required autoComplete="email"
                placeholder="you@example.com"
                value={form.email} onChange={handle}
                className="w-full px-4 py-3 rounded-xl text-sm bg-white border border-gray-200 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-indigo-400 focus:ring-3 focus:ring-indigo-50"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700">Password</label>
                <span className="text-xs text-indigo-600 cursor-pointer hover:underline">Forgot password?</span>
              </div>
              <div className="relative">
                <input name="password" type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password} onChange={handle}
                  className="w-full px-4 py-3 pr-11 rounded-xl text-sm bg-white border border-gray-200 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-indigo-400 focus:ring-3 focus:ring-indigo-50"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  }
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[.99] disabled:opacity-50 mt-1"
              style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)', boxShadow:'0 4px 16px rgba(99,102,241,0.35)' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-100"/>
            <span className="text-xs text-gray-400 font-medium">Demo accounts</span>
            <div className="flex-1 h-px bg-gray-100"/>
          </div>

          {/* Demo credentials */}
          <div className="grid grid-cols-4 gap-2">
            {DEMO.map(d => (
              <button key={d.role} onClick={() => fillDemo(d)}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition-all group">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: d.color }}>
                  {d.role.charAt(0)}
                </div>
                <span className="text-[11px] font-semibold text-gray-500 group-hover:text-indigo-600 transition-colors">{d.role}</span>
              </button>
            ))}
            <div className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                style={{ background:'linear-gradient(135deg,#f97316,#ea580c)' }}>M</div>
              <span className="text-[11px] font-semibold text-gray-400">Manager</span>
            </div>
          </div>
          <p className="text-[11px] text-center text-gray-400 mt-2">
            Click to auto-fill · Manager is created by owners
          </p>

          {/* Legal */}
          <p className="text-center text-xs text-gray-400 mt-6">
            By signing in you agree to our{' '}
            <Link to="/" className="text-indigo-600 hover:underline">Terms</Link> and{' '}
            <Link to="/" className="text-indigo-600 hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
