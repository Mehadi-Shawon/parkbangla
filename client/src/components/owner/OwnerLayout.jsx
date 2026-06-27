import { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import Navbar from '../common/Navbar';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

/* ── Greeting based on time ─────────────────────────────── */
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

/* ── Tab navigation ─────────────────────────────────────── */
const TABS = [
  {
    to: '/owner', exact: true, label: 'Dashboard',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
  },
  {
    to: '/owner/parking', label: 'Locations',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  },
  {
    to: '/owner/reservations', label: 'Reservations',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>,
  },
  {
    to: '/owner/managers', label: 'Managers',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  },
  {
    to: '/owner/activity', label: 'Activity',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>,
  },
];

/* ── Stat pill ──────────────────────────────────────────── */
function StatPill({ icon, value, label, loading }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/70">{icon}</span>
      <span className="text-sm font-bold text-white">
        {loading ? <span className="inline-block w-8 h-3 bg-white/20 rounded animate-pulse" /> : value}
      </span>
      <span className="text-white/50 text-xs hidden sm:inline">{label}</span>
    </div>
  );
}

/* ── Main Layout ────────────────────────────────────────── */
/* ── Owner real-time reservation alerts ─────────────────── */
function useOwnerAlerts(userId) {
  const parkingIdsRef = useRef([]);

  useEffect(() => {
    if (!userId) return;
    // Fetch owner's parking IDs first
    supabase.from('parking_locations')
      .select('id, name')
      .eq('owner_id', userId)
      .eq('status', 'approved')
      .then(({ data }) => {
        parkingIdsRef.current = (data || []);
      });

    const channel = supabase
      .channel(`owner-${userId}-reservations`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'reservations',
      }, (payload) => {
        const parkingId = payload.new?.parking_id;
        const match = parkingIdsRef.current.find(p => p.id === parkingId);
        if (match) {
          toast.success(
            `New booking at ${match.name}!\nVehicle: ${payload.new.vehicle_number}`,
            {
              duration: 6000,
              icon: '🅿️',
              style: { borderRadius: '12px', fontSize: '13px', fontFamily: 'Inter, sans-serif' },
            }
          );
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);
}

/* ── Hook: pending reservation count for tab badge ────────── */
function usePendingCount(userId) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data: parkings } = await supabase
        .from('parking_locations').select('id').eq('owner_id', userId);
      const ids = (parkings||[]).map(p => p.id);
      if (!ids.length) { setCount(0); return; }
      const { count: c } = await supabase
        .from('reservations')
        .select('id', { count:'exact', head:true })
        .in('parking_id', ids)
        .eq('status', 'pending');
      setCount(c || 0);
    };
    load();
    const ch = supabase.channel('owner-pending-count')
      .on('postgres_changes', { event:'*', schema:'public', table:'reservations' }, load)
      .subscribe();
    const interval = setInterval(load, 30000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); };
  }, [userId]);

  return count;
}

/* ── Pending approval screen ────────────────────────────── */
function PendingApproval({ user, logout }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background:'linear-gradient(135deg,#0f0c29 0%,#1e1b4b 45%,#3730a3 100%)' }}>
      {/* Decorative */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full opacity-10"
          style={{ background:'radial-gradient(circle,#818cf8,transparent)', filter:'blur(80px)' }}/>
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize:'28px 28px' }}/>
      </div>

      <div className="relative w-full max-w-md text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center"
          style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)' }}>
          <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>

        <h1 className="text-2xl font-extrabold text-white mb-2">Awaiting Admin Approval</h1>
        <p className="text-indigo-200/70 text-sm leading-relaxed mb-8">
          Hi <span className="text-white font-semibold">{user?.name}</span>, your parking owner account has been created successfully.
          Our admin team will review and activate your account shortly.
        </p>

        {/* Status card */}
        <div className="rounded-2xl p-5 mb-6 text-left space-y-3"
          style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }}>
          {[
            { icon:'✓', label:'Account created',         color:'text-green-400',  done: true  },
            { icon:'⏳', label:'Admin review in progress', color:'text-amber-400',  done: false },
            { icon:'○', label:'Account activation',       color:'text-white/30',   done: false },
            { icon:'○', label:'Start managing parkings',  color:'text-white/30',   done: false },
          ].map((s,i) => (
            <div key={i} className="flex items-center gap-3">
              <span className={`text-sm font-bold flex-shrink-0 ${s.color}`}>{s.icon}</span>
              <span className={`text-sm ${s.done ? 'text-white' : s.color}`}>{s.label}</span>
            </div>
          ))}
        </div>

        <p className="text-indigo-300/60 text-xs mb-6">
          You'll be able to access your dashboard once approved. This usually takes less than 24 hours.
        </p>

        <button onClick={async () => { await logout(); navigate('/'); }}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white/60 border border-white/15 hover:bg-white/10 transition-all">
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function OwnerLayout({
  children,
  title,
  subtitle,
  action,
  showTabs = true,
  back,
}) {
  const { user, logout }  = useAuth();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useOwnerAlerts(user?.id);
  const pendingCount = usePendingCount(user?.id);

  useEffect(() => {
    if (!user || !user.is_active) return;
    const load = async () => {
      const today    = new Date(); today.setHours(0,0,0,0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: parkings } = await supabase
        .from('parking_locations')
        .select('id, available_slots')
        .eq('owner_id', user.id)
        .eq('status', 'approved');

      const ids = (parkings || []).map(p => p.id);
      const freeSlots = (parkings || []).reduce((s, p) => s + p.available_slots, 0);

      let active = 0, todayRevenue = 0;
      if (ids.length) {
        const { data: res } = await supabase
          .from('reservations')
          .select('status, total_amount, created_at')
          .in('parking_id', ids);

        active       = (res||[]).filter(r => r.status === 'active').length;
        todayRevenue = (res||[])
          .filter(r => ['active','completed'].includes(r.status) && r.created_at >= today.toISOString() && r.created_at < tomorrow.toISOString())
          .reduce((s, r) => s + parseFloat(r.total_amount || 0), 0);
      }

      setStats({ locations: ids.length, freeSlots, active, todayRevenue });
      setLoading(false);
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [user]);

  const statItems = [
    {
      icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16h14zm-7-3a1 1 0 110-2 1 1 0 010 2zm3-5H9v-2h6v2zm0-4H9V7h6v2z"/></svg>,
      value: stats?.locations ?? '—',
      label: 'locations',
    },
    {
      icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>,
      value: stats?.freeSlots ?? '—',
      label: 'slots free',
    },
    {
      icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>,
      value: stats?.active ?? '—',
      label: 'active now',
    },
    {
      icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>,
      value: stats ? formatCurrency(stats.todayRevenue) : '—',
      label: "today's revenue",
    },
  ];

  // Show pending approval screen for inactive owners
  if (user && !user.is_active) {
    return <PendingApproval user={user} logout={logout} />;
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-0" style={{ background: '#f8fafc' }}>
      <Navbar />
      <div>

        {/* ── Premium Header — extends behind navbar ── */}
        <div className="relative overflow-hidden"
          style={{ background:'linear-gradient(135deg,#0f0c29 0%,#1e1b4b 30%,#3730a3 70%,#4f46e5 100%)' }}>
          {/* Decorative orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5" />
            <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-indigo-400/10" />
            <div className="absolute top-4 right-1/4 w-2 h-2 rounded-full bg-white/30" />
            <div className="absolute bottom-8 left-12 w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Back button (optional) */}
            {back && (
              <div className="pt-5">
                <Link to={back.to}
                  className="inline-flex items-center gap-1.5 text-indigo-300 text-sm hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                  </svg>
                  {back.label}
                </Link>
              </div>
            )}

            {/* Top row: Greeting + date + action */}
            <div className={`flex items-start justify-between flex-wrap gap-4 ${back ? 'pt-20 pb-5' : 'pt-28 pb-5'}`}>
              <div>
                <p className="text-indigo-300 text-sm font-medium mb-1">
                  {greeting()}, {user?.name?.split(' ')[0]}
                </p>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  {title || 'Owner Portal'}
                </h1>
                {subtitle && (
                  <p className="text-indigo-200 text-sm mt-1">{subtitle}</p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Date chip */}
                <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-indigo-200 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  {new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}
                </div>
                {action}
              </div>
            </div>

            {/* Stats strip */}
            <div className="flex items-center gap-5 pb-4 overflow-x-auto">
              {statItems.map((s, i) => (
                <div key={i} className="flex items-center gap-2 flex-shrink-0">
                  {i > 0 && <span className="text-white/20 text-lg font-thin select-none">·</span>}
                  <StatPill {...s} loading={loading} />
                </div>
              ))}
            </div>

            {/* Tab navigation */}
            {showTabs && (
              <div className="flex items-center -mb-px">
                {TABS.map(tab => (
                  <NavLink key={tab.to} to={tab.to} end={tab.exact}
                    className={({ isActive }) =>
                      `relative flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-2 sm:px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all duration-150
                       ${isActive
                         ? 'text-white border-white bg-white/8'
                         : 'text-white/50 border-transparent hover:text-white/80 hover:bg-white/5'}`
                    }>
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                    {/* Pending badge on Reservations tab */}
                    {tab.to === '/owner/reservations' && pendingCount > 0 && (
                      <span className="min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                        style={{ background:'#ef4444' }}>
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Page content */}
        <div>{children}</div>
      </div>
    </div>
  );
}
