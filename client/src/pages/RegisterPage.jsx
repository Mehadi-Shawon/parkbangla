import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { extractError } from '../utils/helpers';
import toast from 'react-hot-toast';

const ROLES = [
  {
    value: 'driver',
    label: 'Driver',
    sub: 'Find & reserve parking spots',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.5.5M13 16H3m10 0h1m3-10h-3a2 2 0 00-2 2v1h7.5L19 7l-2-1z"/>
      </svg>
    ),
    color: '#22c55e',
  },
  {
    value: 'owner',
    label: 'Parking Owner',
    sub: 'List & manage your parking lots',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
      </svg>
    ),
    color: '#3b82f6',
  },
  {
    value: 'manager',
    label: 'Manager',
    sub: 'Assigned by parking owner only',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
      </svg>
    ),
    color: '#8b5cf6',
  },
];

const FEATURES = [
  'Real-time parking availability',
  'Instant booking confirmation',
  'Entry & exit tracking',
  'Reservation history & receipts',
  'Multi-vehicle management',
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate      = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'driver',
  });
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match.');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters.');
    setLoading(true);
    try {
      const user = await register({ name: form.name, email: form.email, phone: form.phone, password: form.password, role: form.role });
      toast.success('Account created!');
      const dest = user.role === 'owner' ? '/owner' : user.role === 'manager' ? '/manager' : '/dashboard';
      navigate(dest, { replace: true });
    } catch (err) { toast.error(extractError(err)); }
    finally { setLoading(false); }
  };

  const selectedRole = ROLES.find(r => r.value === form.role);

  return (
    <div className="min-h-screen flex" style={{ background:'#f8fafc' }}>

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background:'linear-gradient(135deg,#0f0c29 0%,#1e1b4b 40%,#3730a3 80%,#4f46e5 100%)' }}>

        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
            style={{ background:'radial-gradient(circle,#818cf8,transparent)', filter:'blur(60px)' }}/>
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-15"
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
            </svg>
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-4 leading-tight">
            Join<br/>ParkBangla.
          </h2>
          <p className="text-white/50 text-base leading-relaxed max-w-xs mb-10">
            Create your free account and start parking smarter in minutes.
          </p>

          <div className="space-y-3.5">
            {FEATURES.map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)' }}>
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <span className="text-sm text-white/60">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="h-px w-12 mb-4" style={{ background:'rgba(255,255,255,0.2)' }}/>
          <p className="text-xs text-white/30">Free forever for drivers · No credit card needed</p>
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 relative overflow-y-auto">

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

        <div className="w-full max-w-sm py-8">

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1.5">Create your account</h1>
            <p className="text-sm text-gray-400">
              Already have one?{' '}
              <Link to="/login" className="text-indigo-600 font-semibold hover:underline">Sign in</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Role selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">I want to…</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <label key={r.value}
                    className={`cursor-pointer relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center ${
                      form.role === r.value
                        ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                    <input type="radio" name="role" value={r.value} className="sr-only"
                      checked={form.role === r.value} onChange={handle}/>
                    <span style={{ color: form.role === r.value ? r.color : '#9ca3af' }}>{r.icon}</span>
                    <div>
                      <p className={`text-xs font-bold ${form.role === r.value ? 'text-gray-900' : 'text-gray-500'}`}>
                        {r.label}
                      </p>
                    </div>
                    {form.role === r.value && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: r.color }}>
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                        </svg>
                      </div>
                    )}
                  </label>
                ))}
              </div>
              {form.role === 'manager' && (
                <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                  Manager accounts are created by parking owners. Register with the email your owner provided.
                </p>
              )}
            </div>

            {/* Name + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
                <input name="name" type="text" required placeholder="John Smith"
                  value={form.name} onChange={handle}
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-white border border-gray-200 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-indigo-400 focus:ring-3 focus:ring-indigo-50"/>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Phone <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </label>
                <input name="phone" type="tel" placeholder="+1 555 0100"
                  value={form.phone} onChange={handle}
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-white border border-gray-200 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-indigo-400 focus:ring-3 focus:ring-indigo-50"/>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address *</label>
              <input name="email" type="email" required placeholder="you@example.com"
                value={form.email} onChange={handle}
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-white border border-gray-200 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-indigo-400 focus:ring-3 focus:ring-indigo-50"/>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password *</label>
                <div className="relative">
                  <input name="password" type={showPw ? 'text' : 'password'} required placeholder="Min. 6 chars"
                    value={form.password} onChange={handle}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm bg-white border border-gray-200 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-indigo-400 focus:ring-3 focus:ring-indigo-50"/>
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm *</label>
                <input name="confirmPassword" type={showPw ? 'text' : 'password'} required placeholder="Repeat"
                  value={form.confirmPassword} onChange={handle}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm bg-white border text-gray-900 placeholder-gray-400 outline-none transition-all focus:ring-3 ${
                    form.confirmPassword && form.password !== form.confirmPassword
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-50'
                      : 'border-gray-200 focus:border-indigo-400 focus:ring-indigo-50'
                  }`}/>
              </div>
            </div>

            {/* Password mismatch hint */}
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="text-xs text-red-500 -mt-2">Passwords don't match</p>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[.99] disabled:opacity-50 mt-1"
              style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)', boxShadow:'0 4px 16px rgba(99,102,241,0.35)' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating account...
                </span>
              ) : `Create ${selectedRole?.label || ''} Account`}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-5">
            By registering you agree to our{' '}
            <Link to="/" className="text-indigo-600 hover:underline">Terms</Link> and{' '}
            <Link to="/" className="text-indigo-600 hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
