import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getInitials, formatDateTime } from '../../utils/helpers';
import ConfirmDialog from './ConfirmDialog';
import MobileBottomNav from './MobileBottomNav';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

/* ── Notification Bell (manager + driver) ───────────────── */
function NotificationBell({ user }) {
  const navigate  = useNavigate();
  const bellRef   = useRef(null);
  const [open,    setOpen]    = useState(false);
  const [items,   setItems]   = useState([]);
  const [count,   setCount]   = useState(0);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (user.role === 'manager') {
        const { data: parking } = await supabase
          .from('parking_locations').select('id').eq('manager_id', user.id).single();
        if (!parking) { setCount(0); setItems([]); return; }
        const { data, count: c } = await supabase
          .from('reservations')
          .select('id, vehicle_number, vehicle_type, start_time, driver:users!reservations_user_id_fkey(name)', { count: 'exact' })
          .eq('parking_id', parking.id).eq('status', 'pending')
          .order('created_at', { ascending: false }).limit(6);
        setItems(data || []); setCount(c || 0);

      } else if (user.role === 'driver') {
        const { data, count: c } = await supabase
          .from('reservations')
          .select('id, status, vehicle_number, start_time, parking:parking_locations(name)', { count: 'exact' })
          .eq('user_id', user.id).in('status', ['confirmed', 'active'])
          .order('start_time', { ascending: true }).limit(6);
        setItems(data || []); setCount(c || 0);

      } else if (user.role === 'owner') {
        const { data: parks } = await supabase
          .from('parking_locations').select('id').eq('owner_id', user.id);
        const ids = (parks || []).map(p => p.id);
        if (!ids.length) { setCount(0); setItems([]); return; }
        const { data, count: c } = await supabase
          .from('reservations')
          .select('id, vehicle_number, start_time, parking:parking_locations(name)', { count: 'exact' })
          .in('parking_id', ids).eq('status', 'pending')
          .order('created_at', { ascending: false }).limit(6);
        setItems(data || []); setCount(c || 0);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!user || user.role === 'admin') return;
    load();
    const ch = supabase.channel(`navbar-notif-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, load)
      .subscribe();
    const t = setInterval(load, 30000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [user?.id]);

  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user || user.role === 'admin') return null;

  const label = user.role === 'manager' ? 'Pending Approvals'
              : user.role === 'driver'  ? 'Active Bookings'
              : 'Pending Reservations';

  const goTo  = user.role === 'manager' ? '/manager'
              : user.role === 'driver'  ? '/reservations'
              : '/owner/reservations';

  const statusColor = (s) =>
    s === 'active'    ? '#22c55e' :
    s === 'confirmed' ? '#3b82f6' : '#f59e0b';

  return (
    <div ref={bellRef} className="relative flex-shrink-0">
      <button onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-white/15">
        <svg className="w-[18px] h-[18px] text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1 animate-pulse"
            style={{ background: '#ef4444' }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-50"
          style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 16px 40px rgba(0,0,0,0.12)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-bold text-gray-800">Notifications</p>
              <p className="text-xs text-gray-400">
                {count > 0 ? `${count} ${label.toLowerCase()}` : 'All caught up!'}
              </p>
            </div>
            {count > 0 && (
              <button onClick={() => { navigate(goTo); setOpen(false); }}
                className="text-xs font-semibold text-indigo-600 hover:underline">View all</button>
            )}
          </div>

          {/* Items */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <svg className="w-5 h-5 text-gray-300 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p className="text-sm text-gray-400">Nothing to act on right now</p>
              </div>
            ) : items.map((item, i) => (
              <button key={item.id}
                onClick={() => { navigate(goTo); setOpen(false); }}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                style={{ borderBottom: i < items.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: item.status ? `${statusColor(item.status)}15` : '#fef3c7' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    style={{ color: item.status ? statusColor(item.status) : '#f59e0b' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.5.5M13 16H3"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {item.driver?.name || item.parking?.name || item.vehicle_number}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {item.vehicle_number} · {formatDateTime(item.start_time)}
                  </p>
                  {item.status && (
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                      style={{ background: `${statusColor(item.status)}15`, color: statusColor(item.status) }}>
                      {item.status}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100">
            <button onClick={() => { navigate(goTo); setOpen(false); }}
              className="w-full text-center text-xs font-semibold text-gray-400 hover:text-indigo-600 transition-colors py-1">
              {user.role === 'manager' ? 'Open manager dashboard →'
               : user.role === 'driver' ? 'View all my bookings →'
               : 'View all reservations →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();
  const location          = useLocation();
  const [menu,    setMenu]    = useState(false);
  const [userDdp, setUserDdp] = useState(false);
  const [scrolled,setScrolled]= useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenu(false); setUserDdp(false); }, [location.pathname]);

  const handleLogout = () => {
    setUserDdp(false);
    setMenu(false);
    setConfirm({
      title:        'Sign out?',
      message:      'You will be returned to the home page.',
      confirmLabel: 'Sign out',
      danger:       true,
      onConfirm:    () => { logout(); navigate('/'); },
    });
  };

  const dashboardLink =
    user?.role === 'admin'   ? '/admin'   :
    user?.role === 'owner'   ? '/owner'   :
    user?.role === 'manager' ? '/manager' : '/dashboard';

  const navLinks = user ? [] : [
    { to: '/',       label: 'Home',        exact: true },
    { to: '/search', label: 'Find Parking' },
  ];

  /* ── Always indigo gradient — just adjust opacity on scroll ── */
  const navBg = 'border-white/10';

  const navStyle = {
    background: scrolled
      ? 'linear-gradient(135deg,rgba(15,12,41,0.88) 0%,rgba(30,27,75,0.82) 100%)'
      : 'linear-gradient(135deg,rgba(15,12,41,0.55) 0%,rgba(30,27,75,0.45) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  };

  const logoTextColor = 'text-white';
  const linkColor     = 'text-white/65 hover:text-white hover:bg-white/10';
  const burgerColor   = 'text-white/65';

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b ${navBg}`}
        style={navStyle}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
                style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)', boxShadow:'0 0 12px rgba(99,102,241,0.4)' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <span className={`text-base font-extrabold tracking-tight transition-colors ${logoTextColor}`}>
                ParkBangla
              </span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(l => (
                <NavLink key={l.to} to={l.to} end={l.exact}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                     ${isActive ? 'text-white bg-white/10' : linkColor}`
                  }>
                  {l.label}
                </NavLink>
              ))}
            </div>

            {/* Right: auth */}
            <div className="flex items-center gap-2">
              <NotificationBell user={user} />
              {user ? (
                <div className="relative hidden sm:block">
                  <button onClick={() => setUserDdp(v => !v)}
                    className="flex items-center gap-1.5 sm:gap-2.5 pl-1.5 sm:pl-2 pr-1.5 sm:pr-3 py-1.5 rounded-xl transition-all hover:bg-white/10">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                      {getInitials(user.name)}
                    </div>
                    <span className="hidden sm:block text-sm font-medium max-w-[110px] truncate text-white/80">
                      {user.name}
                    </span>
                    <svg className={`hidden sm:block w-3.5 h-3.5 text-white/50 transition-transform ${userDdp ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>

                  {/* Dropdown */}
                  {userDdp && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl overflow-hidden z-50"
                      style={{ background:'rgba(255,255,255,0.95)', backdropFilter:'blur(20px)', border:'1px solid rgba(0,0,0,0.08)', boxShadow:'0 8px 32px rgba(0,0,0,0.12)' }}>
                      {/* User info */}
                      <div className="px-4 py-3.5 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                            style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                            {getInitials(user.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                            <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                          </div>
                        </div>
                      </div>
                      {/* Links */}
                      <div className="p-1.5">
                        {[
                          { to: dashboardLink, label:'Dashboard', icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
                          { to: '/profile',     label:'Profile',   icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> },
                        ].map(item => (
                          <Link key={item.to} to={item.to} onClick={() => setUserDdp(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all">
                            <span className="text-gray-400">{item.icon}</span>
                            {item.label}
                          </Link>
                        ))}
                      </div>
                      {/* Logout */}
                      <div className="p-1.5 border-t border-gray-100">
                        <button onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-500 hover:text-red-600 hover:bg-red-50 transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                          </svg>
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Link to="/login"
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200">
                    Sign in
                  </Link>
                  <Link to="/register"
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                    style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)', boxShadow:'0 2px 10px rgba(99,102,241,0.4)' }}>
                    Get Started
                  </Link>
                </div>
              )}

              {/* Mobile hamburger */}
              <button onClick={() => setMenu(v => !v)}
                className={`md:hidden p-2 rounded-lg transition-colors hover:bg-white/10 ${burgerColor}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {menu
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
                  }
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menu && (
          <div className="md:hidden px-4 py-3 space-y-1"
            style={{ background:'linear-gradient(135deg,rgba(15,12,41,0.95),rgba(30,27,75,0.92))', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
            {navLinks.map(l => (
              <NavLink key={l.to} to={l.to} end={l.exact} onClick={() => setMenu(false)}
                className={({ isActive }) =>
                  `block px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/8'}`}>
                {l.label}
              </NavLink>
            ))}
            {!user ? (
              <div className="pt-2 space-y-2" style={{ borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                <Link to="/login" onClick={() => setMenu(false)}
                  className="block w-full text-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-all">
                  Sign in
                </Link>
                <Link to="/register" onClick={() => setMenu(false)}
                  className="block w-full text-center px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                  Get Started
                </Link>
              </div>
            ) : (
              <div className="pt-2 space-y-1" style={{ borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                {/* User info row */}
                <div className="flex items-center gap-3 px-4 py-2.5 mb-1">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                    {getInitials(user?.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                    <p className="text-xs text-white/40 capitalize">{user?.role}</p>
                  </div>
                </div>
                <Link to={dashboardLink} onClick={() => setMenu(false)} className="block px-4 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/8 transition-all">Dashboard</Link>
                <Link to="/profile" onClick={() => setMenu(false)} className="block px-4 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/8 transition-all">Profile</Link>
                <button onClick={handleLogout} className="block w-full text-left px-4 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all">Sign out</button>
              </div>
            )}
          </div>
        )}
      </nav>

      {userDdp && <div className="fixed inset-0 z-40" onClick={() => setUserDdp(false)}/>}
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)}/>
      <MobileBottomNav/>
    </>
  );
}
