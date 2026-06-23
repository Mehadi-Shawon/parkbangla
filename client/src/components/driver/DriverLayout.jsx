import { useState, useEffect, useRef } from 'react';
import { NavLink, Link } from 'react-router-dom';
import Navbar from '../common/Navbar';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const TABS = [
  {
    to: '/dashboard', exact: true, label: 'Home',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
  },
  {
    to: '/search', label: 'Find Parking',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
  },
  {
    to: '/reservations', label: 'My Bookings',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>,
  },
];

/* ── Live timer ─────────────────────────────────────────── */
function useTimer(date, mode = 'countdown') {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!date) return;
    const tick = () => setMs(mode === 'countdown'
      ? Math.max(0, new Date(date) - Date.now())
      : Math.max(0, Date.now() - new Date(date)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [date, mode]);
  return ms;
}

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sc = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m`;
  return `${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`;
}

/* ── Booking status strip ───────────────────────────────── */
const JOURNEY_STEPS = [
  { key:'pending',   label:'Pending',   color:'#f59e0b' },
  { key:'confirmed', label:'Confirmed', color:'#3b82f6' },
  { key:'active',    label:'Parked',    color:'#22c55e' },
  { key:'completed', label:'Completed', color:'#8b5cf6' },
];
const STEP_IDX = { pending:0, confirmed:1, active:2, completed:3 };

function BookingStatusStrip({ user }) {
  const [res, setRes] = useState(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('reservations')
        .select('id, status, start_time, end_time, entry_time, vehicle_number, parking:parking_locations(name, address)')
        .eq('user_id', user.id)
        .in('status', ['pending', 'confirmed', 'active'])
        .order('start_time', { ascending: true })
        .limit(1);
      const found = data?.[0] || null;
      if (found?.status === 'confirmed' && new Date(found.start_time) - Date.now() > 3 * 3600000) {
        setRes(null); return;
      }
      setRes(found);
    };
    fetch();
    const ch = supabase.channel('driver-status-strip')
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'reservations' }, fetch)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user]);

  const elapsed   = useTimer(res?.entry_time, 'elapsed');
  const remaining = useTimer(res?.end_time,   'countdown');
  const untilIn   = useTimer(res?.start_time, 'countdown');

  if (!res) return null;

  const isActive  = res.status === 'active';
  const isOverdue = isActive && remaining === 0;
  const stepIdx   = STEP_IDX[res.status] ?? 1;

  // Time bar
  const entryMs     = res.entry_time ? new Date(res.entry_time).getTime() : null;
  const endMs       = new Date(res.end_time).getTime();
  const totalActive = entryMs ? endMs - entryMs : 1;
  const timePct     = isActive ? Math.min(100, (elapsed / totalActive) * 100) : 0;
  const barColor    = isOverdue ? '#ef4444' : remaining < 600000 ? '#f97316' : '#22c55e';

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-3" style={{ background:'#f8fafc' }}>
      <div className="max-w-7xl mx-auto">
        <Link to={`/reservation/${res.id}`}
          className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">

          {/* Colored top stripe */}
          <div className="h-1 w-full"
            style={{ background:`linear-gradient(90deg,${JOURNEY_STEPS[stepIdx].color},${JOURNEY_STEPS[stepIdx].color}88)` }}/>

          <div className="px-5 py-4">
            {/* Top: label + parking + timer */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                    style={{ background: JOURNEY_STEPS[stepIdx].color }}/>
                  <p className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: JOURNEY_STEPS[stepIdx].color }}>
                    {isActive ? 'Currently Parked' : res.status === 'confirmed' ? 'Upcoming Booking' : 'Pending Approval'}
                  </p>
                </div>
                <p className="text-sm font-bold text-gray-900 truncate">{res.parking?.name}</p>
                <p className="text-xs text-gray-400 truncate">{res.parking?.address}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-mono text-gray-600">{res.vehicle_number}</p>
                {isActive ? (
                  <div className="mt-1 text-right">
                    <span className="text-xs font-mono font-bold text-gray-800">{fmt(elapsed)}</span>
                    <span className="text-xs text-gray-400"> · </span>
                    <span className={`text-xs font-mono font-bold ${isOverdue ? 'text-red-500' : remaining < 600000 ? 'text-orange-500' : 'text-green-600'}`}>
                      {isOverdue ? 'Overdue!' : `${fmt(remaining)} left`}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-blue-600 font-medium mt-1">
                    In <span className="font-mono font-bold">{fmt(untilIn)}</span>
                  </p>
                )}
                <p className="text-[10px] text-indigo-500 font-semibold mt-1 group-hover:underline">Track →</p>
              </div>
            </div>

            {/* 4-step stepper */}
            <div className="flex items-center">
              {JOURNEY_STEPS.map((step, i) => {
                const done    = i < stepIdx;
                const current = i === stepIdx;
                return (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{
                          background: done ? step.color : current ? '#fff' : '#f1f5f9',
                          border: `2px solid ${done || current ? step.color : '#e2e8f0'}`,
                          boxShadow: current ? `0 0 0 3px ${step.color}20` : 'none',
                        }}>
                        {done ? (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                          </svg>
                        ) : current ? (
                          <span className="w-2 h-2 rounded-full" style={{ background: step.color }}/>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-gray-300"/>
                        )}
                      </div>
                      <span className="text-[10px] font-bold mt-1 whitespace-nowrap"
                        style={{ color: done || current ? step.color : '#d1d5db' }}>
                        {step.label}
                      </span>
                    </div>
                    {i < JOURNEY_STEPS.length - 1 && (
                      <div className="flex-1 h-0.5 mx-1 mb-4 rounded-full"
                        style={{ background: i < stepIdx ? JOURNEY_STEPS[i].color : '#e2e8f0' }}/>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time bar — only when parked */}
            {isActive && (
              <div className="mt-3">
                <div className="h-1.5 rounded-full overflow-hidden bg-gray-100">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width:`${timePct}%`, background:barColor, boxShadow:`0 0 6px ${barColor}50` }}/>
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-[10px] text-gray-400">Entry</span>
                  <span className="text-[10px] font-bold" style={{ color:barColor }}>{Math.round(timePct)}% used</span>
                  <span className="text-[10px] text-gray-400">Check-out</span>
                </div>
              </div>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}

/* ── Real-time driver status-change notifications ─────────── */
function useDriverNotifications(user) {
  const prevStatusRef = useRef({});

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`driver-notif-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'reservations',
      }, (payload) => {
        const r = payload.new;
        if (r.user_id !== user.id) return;
        const prev = prevStatusRef.current[r.id];
        if (prev === r.status) return;
        prevStatusRef.current[r.id] = r.status;

        if (r.status === 'confirmed' && prev === 'pending') {
          toast.success('Your booking has been confirmed!', {
            duration: 8000, icon: '✅',
            style: { borderRadius: '12px', fontSize: '14px', fontFamily: 'Inter, sans-serif' },
          });
        } else if (r.status === 'cancelled' && prev === 'pending') {
          toast.error('Your booking request was declined.', {
            duration: 8000,
            style: { borderRadius: '12px', fontSize: '14px', fontFamily: 'Inter, sans-serif' },
          });
        } else if (r.status === 'active' && prev === 'confirmed') {
          toast('Vehicle entry marked. Enjoy your parking!', {
            icon: '🚗', duration: 6000,
            style: { borderRadius: '12px', fontSize: '14px', fontFamily: 'Inter, sans-serif' },
          });
        } else if (r.status === 'completed') {
          toast('Parking session completed. Thank you!', {
            icon: '🏁', duration: 6000,
            style: { borderRadius: '12px', fontSize: '14px', fontFamily: 'Inter, sans-serif' },
          });
        }
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user?.id]);
}

export default function DriverLayout({ children, title, subtitle, action }) {
  const { user } = useAuth();
  useDriverNotifications(user);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen pb-20 lg:pb-0" style={{ background: '#f8fafc' }}>
      <Navbar />
      <div>

        {/* Hero extends from top-0, navbar floats on top of it */}
        <div className="relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#0f0c29 0%,#1e1b4b 30%,#3730a3 70%,#4f46e5 100%)' }}>
          {/* Decorative blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-indigo-400/10" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Title row — pt-28 = 64px navbar + comfortable gap */}
            <div className="flex items-start justify-between pt-28 pb-6 flex-wrap gap-4">
              <div>
                <p className="text-indigo-300 text-sm font-medium mb-0.5">
                  {greeting()}, {user?.name?.split(' ')[0]}
                </p>
                <h1 className="text-2xl font-extrabold text-white">
                  {title || 'Dashboard'}
                </h1>
                {subtitle && (
                  <p className="text-indigo-200 text-sm mt-0.5">{subtitle}</p>
                )}
              </div>
              {action && <div className="flex-shrink-0">{action}</div>}
            </div>

            {/* Tab bar */}
            <div className="flex items-center gap-0 -mb-px overflow-x-auto">
              {TABS.map(tab => (
                <NavLink key={tab.to} to={tab.to} end={tab.exact}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex-shrink-0
                     ${isActive
                       ? 'text-white border-white'
                       : 'text-white/50 border-transparent hover:text-white/80 hover:border-white/30'}`
                  }>
                  {tab.icon}
                  {tab.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>

        {/* Booking status strip */}
        <BookingStatusStrip user={user} />

        {/* Page content */}
        {children}
      </div>
    </div>
  );
}
