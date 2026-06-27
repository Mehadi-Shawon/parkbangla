import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import ConfirmDialog from '../common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { getInitials, formatDate } from '../../utils/helpers';
import * as adminService from '../../services/adminService';
import { supabase } from '../../lib/supabase';

/* ── Icons ─────────────────────────────────────────────── */
const Icons = {
  Logo: () => (
    <svg viewBox="0 0 36 36" fill="none" className="w-9 h-9 flex-shrink-0">
      <rect width="36" height="36" rx="12" fill="url(#alg)" />
      <defs><linearGradient id="alg" x1="0" y1="0" x2="36" y2="36"><stop stopColor="#6366f1"/><stop offset="1" stopColor="#2563eb"/></linearGradient></defs>
      <path d="M11 26V14a2 2 0 012-2h5a5 5 0 010 10h-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Dashboard:    () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
  Users:        () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  Parking:      () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>,
  Reservations: () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>,
  Managers:     () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  Activity:     () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>,
  Analytics:    () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
  Map:          () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>,
  Pending:      () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>,
  Settings:     () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  Owners:       () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>,
  Logout:       () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>,
  Menu:         () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>,
};

const NAV = [
  { to: '/admin',              icon: Icons.Dashboard,    label: 'Dashboard',    exact: true },
  { to: '/admin/users',        icon: Icons.Users,        label: 'Users'         },
  { to: '/admin/reservations', icon: Icons.Reservations, label: 'Reservations'  },
  { to: '/admin/parking',      icon: Icons.Parking,      label: 'Parking'       },
  { to: '/admin/managers',     icon: Icons.Managers,     label: 'Managers'      },
  { to: '/admin/park-owners',  icon: Icons.Owners,       label: 'Park Owners'   },
  { to: '/admin/analytics',    icon: Icons.Analytics,    label: 'Analytics'     },
  { to: '/admin/map',          icon: Icons.Map,          label: 'Map View'      },
  { to: '/admin/activity',     icon: Icons.Activity,     label: 'Activity Log'  },
  { to: '/admin/settings',     icon: Icons.Settings,     label: 'Settings'      },
];

function useLiveBadges() {
  const [badges, setBadges] = useState({ pending: 0, active: 0, owners: 0 });
  useEffect(() => {
    const load = async () => {
      const [{ count: pending }, { count: active }, { count: owners }] = await Promise.all([
        supabase.from('parking_locations').select('id', { count:'exact', head:true }).eq('status','pending'),
        supabase.from('reservations').select('id', { count:'exact', head:true }).eq('status','active'),
        supabase.from('users').select('id', { count:'exact', head:true }).eq('role','owner').eq('is_active',false),
      ]);
      setBadges({ pending: pending||0, active: active||0, owners: owners||0 });
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);
  return badges;
}

function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();
  const [confirm, setConfirm] = useState(null);
  const badges = useLiveBadges();

  const handleLogout = () => {
    setConfirm({
      title:        'Sign out?',
      message:      'You will be returned to the home page.',
      confirmLabel: 'Sign out',
      danger:       true,
      onConfirm:    async () => { await logout(); navigate('/'); },
    });
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 relative
     ${isActive
       ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-200'
       : 'text-slate-500 hover:text-slate-800 hover:bg-indigo-50'}`;

  return (
    <aside className="flex flex-col h-full w-64 relative overflow-hidden" style={{
      background: 'linear-gradient(160deg,#0a0818 0%,#0f0c29 30%,#1a1040 70%,#0f0c29 100%)',
      borderRight: '1px solid rgba(99,102,241,0.15)',
    }}>
      {/* Decorative glow */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
        style={{ background:'radial-gradient(circle,rgba(99,102,241,0.15),transparent 70%)' }}/>
      <div className="absolute bottom-40 -left-16 w-48 h-48 rounded-full pointer-events-none"
        style={{ background:'radial-gradient(circle,rgba(139,92,246,0.08),transparent 70%)' }}/>

      {/* Logo */}
      <div className="relative flex items-center gap-3 px-5 h-16 flex-shrink-0"
        style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <Icons.Logo />
        <div>
          <p className="font-extrabold text-base leading-tight text-white tracking-tight">ParkBangla</p>
          <p className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color:'rgba(165,180,252,0.5)' }}>Admin Console</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-2.5 py-5 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: NavIcon, label, exact }) => (
          <NavLink key={to} to={to} end={exact} onClick={onClose}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
               ${isActive
                 ? 'text-white'
                 : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`
            }>
            {({ isActive }) => (
              <>
                {/* Active background */}
                {isActive && (
                  <div className="absolute inset-0 rounded-xl"
                    style={{ background:'linear-gradient(135deg,rgba(99,102,241,0.4),rgba(79,70,229,0.25))', border:'1px solid rgba(99,102,241,0.3)', boxShadow:'0 0 20px rgba(99,102,241,0.15)' }}/>
                )}
                {/* Active left bar */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                    style={{ background:'linear-gradient(180deg,#818cf8,#6366f1)' }}/>
                )}

                <span className="relative z-10 flex-shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:-translate-y-0.5"
                  style={{ color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.35)' }}>
                  <NavIcon />
                </span>
                <span className="relative z-10 flex-1 font-semibold">{label}</span>

                {/* Badges */}
                {to === '/admin/parking' && badges.pending > 0 && (
                  <span className="relative z-10 ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 bg-red-500 text-white">
                    {badges.pending > 99 ? '99+' : badges.pending}
                  </span>
                )}
                {to === '/admin/reservations' && badges.active > 0 && (
                  <span className="relative z-10 ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 bg-green-500 text-white">
                    {badges.active > 99 ? '99+' : badges.active}
                  </span>
                )}
                {to === '/admin/park-owners' && badges.owners > 0 && (
                  <span className="relative z-10 ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 text-white"
                    style={{ background:'#f97316' }}>
                    {badges.owners > 99 ? '99+' : badges.owners}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User card */}
      <div className="relative px-3 pb-4 pt-3 flex-shrink-0"
        style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 px-3 py-3 rounded-2xl mb-2"
          style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)', boxShadow:'0 4px 12px rgba(99,102,241,0.4)' }}>
            {getInitials(user?.name || 'A')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{user?.name}</p>
            <p className="text-[11px] truncate" style={{ color:'rgba(165,180,252,0.5)' }}>{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ color:'rgba(255,255,255,0.25)', border:'1px solid rgba(255,255,255,0.06)' }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.12)'; e.currentTarget.style.color='#f87171'; e.currentTarget.style.borderColor='rgba(239,68,68,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.25)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; }}>
          <Icons.Logout />
          Sign out
        </button>
      </div>

      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </aside>
  );
}

/* ── Page title map ─────────────────────────────────────── */
const PAGE_TITLES = {
  '/admin':              'Dashboard',
  '/admin/users':        'Users',
  '/admin/parking':      'Parking',
  '/admin/reservations': 'Reservations',
};

/* ── Global Search ──────────────────────────────────────── */
function GlobalSearch() {
  const navigate      = useNavigate();
  const inputRef      = useRef(null);
  const dropdownRef   = useRef(null);
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState({ users: [], parkings: [] });
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);

  // Ctrl+K / Cmd+K to focus
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults({ users: [], parkings: [] }); setOpen(false); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [u, p] = await Promise.all([
          adminService.getAllUsers({ search: query, limit: 4 }),
          adminService.getAllParkings({ search: query, limit: 4 }),
        ]);
        setResults({ users: u.data, parkings: p.data });
        setOpen(true);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  const go = (path) => { navigate(path); setOpen(false); setQuery(''); };
  const hasResults = results.users.length > 0 || results.parkings.length > 0;

  return (
    <div className="relative flex-1 max-w-md">
      {/* Input */}
      <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl transition-all"
        style={{ background:'rgba(255,255,255,0.75)', border:'1px solid rgba(99,102,241,0.18)', boxShadow:'0 1px 4px rgba(99,102,241,0.07)' }}>
        {loading
          ? <svg className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          : <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
        }
        <input
          ref={inputRef}
          type="text"
          placeholder="Search users, parking…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none min-w-0"
        />
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded-md px-1.5 py-0.5 flex-shrink-0">
          Ctrl K
        </kbd>
      </div>

      {/* Dropdown */}
      {open && (
        <div ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50"
          style={{ background:'rgba(255,255,255,0.92)', backdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.9)', boxShadow:'0 16px 40px rgba(99,102,241,0.15)' }}>

          {!hasResults ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              No results for <strong className="text-slate-600">"{query}"</strong>
            </div>
          ) : (
            <div className="py-1.5 max-h-80 overflow-y-auto">

              {results.users.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Users</p>
                  {results.users.map(u => (
                    <button key={u.id} onClick={() => go('/admin/users')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 transition-colors text-left">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{u.name}</p>
                        <p className="text-xs text-slate-400 truncate">{u.email} · {u.role}</p>
                      </div>
                      <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                        u.role === 'admin' ? 'bg-violet-50 text-violet-600 border-violet-200' :
                        u.role === 'owner' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {u.role}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {results.parkings.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parking</p>
                  {results.parkings.map(p => (
                    <button key={p.id} onClick={() => go('/admin/parking')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 transition-colors text-left">
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background:'rgba(99,102,241,0.1)' }}>
                        <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                        <p className="text-xs text-slate-400 truncate">{p.address}</p>
                      </div>
                      <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                        p.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                        p.status === 'pending'  ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {p.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="px-4 py-2 mt-1 border-t border-black/5 flex items-center justify-between">
                <span className="text-[10px] text-slate-300">Press Esc to close</span>
                <span className="text-[10px] text-slate-300">{results.users.length + results.parkings.length} result{results.users.length + results.parkings.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Top Bar ────────────────────────────────────────────── */
/* ── Notification Bell ──────────────────────────────────── */
function NotificationBell() {
  const navigate    = useNavigate();
  const bellRef     = useRef(null);
  const [open,      setOpen]      = useState(false);
  const [pending,   setPending]   = useState([]);
  const [count,     setCount]     = useState(0);
  const [approving, setApproving] = useState(null);

  const load = async () => {
    const { data, count: c } = await supabase
      .from('parking_locations')
      .select('id, name, address, created_at', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(6);
    setPending(data || []);
    setCount(c || 0);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const approve = async (id, e) => {
    e.stopPropagation();
    setApproving(id);
    await supabase.from('parking_locations').update({ status: 'approved' }).eq('id', id);
    await load();
    setApproving(null);
  };

  return (
    <div ref={bellRef} className="relative flex-shrink-0">
      <button onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all hover:bg-slate-100"
        style={{ border: '1px solid #e2e8f0' }}>
        <svg className="w-[18px] h-[18px] text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
            style={{ background: '#ef4444' }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-50"
          style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 16px 40px rgba(0,0,0,0.10)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <p className="text-sm font-bold text-slate-800">Notifications</p>
              <p className="text-xs text-slate-400">{count} pending approval{count !== 1 ? 's' : ''}</p>
            </div>
            {count > 0 && (
              <button onClick={() => { navigate('/admin/parking'); setOpen(false); }}
                className="text-xs font-semibold text-indigo-600 hover:underline">View all</button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p className="text-sm text-slate-400">All caught up!</p>
              </div>
            ) : pending.map((p, i) => (
              <div key={p.id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                style={{ borderBottom: i < pending.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: '#fef3c7' }}>
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400 truncate">{p.address}</p>
                  <p className="text-[10px] text-slate-300 mt-0.5">{formatDate(p.created_at)}</p>
                </div>
                <button onClick={(e) => approve(p.id, e)} disabled={approving === p.id}
                  className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
                  style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669' }}>
                  {approving === p.id ? '…' : 'Approve'}
                </button>
              </div>
            ))}
          </div>

          <div className="px-4 py-2.5" style={{ borderTop: '1px solid #f1f5f9' }}>
            <button onClick={() => { navigate('/admin/parking'); setOpen(false); }}
              className="w-full text-center text-xs font-semibold text-slate-400 hover:text-indigo-600 transition-colors py-1">
              Manage all parking locations →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Quick Stats Chips ──────────────────────────────────── */
function QuickStats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pending: 0, active: 0 });

  useEffect(() => {
    const load = async () => {
      const [p, a] = await Promise.all([
        supabase.from('parking_locations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      ]);
      setStats({ pending: p.count || 0, active: a.count || 0 });
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden md:flex items-center gap-2 flex-shrink-0">
      <button onClick={() => navigate('/admin/parking')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105"
        style={{
          background: stats.pending > 0 ? 'linear-gradient(135deg,#fef3c7,#fffbeb)' : '#f8fafc',
          border: `1px solid ${stats.pending > 0 ? '#fbbf24' : '#e2e8f0'}`,
          color: stats.pending > 0 ? '#d97706' : '#94a3b8',
          boxShadow: stats.pending > 0 ? '0 2px 8px rgba(251,191,36,0.25)' : 'none',
        }}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>{stats.pending} pending</span>
      </button>

      <button onClick={() => navigate('/admin/reservations')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105"
        style={{
          background: stats.active > 0 ? 'linear-gradient(135deg,#d1fae5,#ecfdf5)' : '#f8fafc',
          border: `1px solid ${stats.active > 0 ? '#34d399' : '#e2e8f0'}`,
          color: stats.active > 0 ? '#059669' : '#94a3b8',
          boxShadow: stats.active > 0 ? '0 2px 8px rgba(52,211,153,0.25)' : 'none',
        }}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
        </svg>
        <span>{stats.active} active</span>
      </button>
    </div>
  );
}

/* ── Top Bar ────────────────────────────────────────────── */
function TopBar({ mobileMenuOpen }) {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-6 h-16 flex-shrink-0"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(99,102,241,0.1)',
        boxShadow: '0 1px 24px rgba(99,102,241,0.06)',
      }}>

      {/* Left accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(to right, #6366f1 0%, #a5b4fc 30%, transparent 70%)' }}/>

      {/* Mobile hamburger */}
      <button onClick={mobileMenuOpen}
        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
        <Icons.Menu />
      </button>

      {/* Search */}
      <GlobalSearch />

      {/* Right group */}
      <div className="ml-auto flex items-center gap-2 flex-shrink-0">
        <QuickStats />
        <NotificationBell />
      </div>
    </div>
  );
}

/* ── Real-time alert hook ───────────────────────────────── */
function useRealtimeAlerts() {
  useEffect(() => {
    const channel = supabase
      .channel('admin-alerts')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'parking_locations',
      }, (payload) => {
        if (payload.new.status === 'pending') {
          toast(`New parking submitted: ${payload.new.name}`, {
            icon: '🏢',
            duration: 6000,
            style: { borderRadius: '12px', fontFamily: 'Inter, sans-serif', fontSize: '14px' },
          });
        }
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'reservations',
      }, () => {
        // silently refresh notification bell — handled by bell component
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);
}

export default function AdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  useRealtimeAlerts();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#ffffff' }}>

      {/* Desktop sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar mobileMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto admin-bg">{children}</main>
      </div>
    </div>
  );
}
