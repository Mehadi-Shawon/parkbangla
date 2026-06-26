import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import * as managerService from '../../services/managerService';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDateTime, timeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';

/* ── SVG Icons ─────────────────────────────────────────── */
const I = {
  Car:      () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.5.5M13 16H3"/></svg>,
  Check:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>,
  X:        () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>,
  Enter:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14"/></svg>,
  Exit:     () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>,
  Search:   () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
  Refresh:  () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
  Clock:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={1.8}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v6l4 2"/></svg>,
  Phone:    () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>,
};

/* ── Live Activity Feed ─────────────────────────────────── */
const EVENT_CONFIG = {
  pending:   { label:'New booking',     color:'#f59e0b', bg:'#fffbeb',
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 110 20A10 10 0 0112 2zm.75 5.75v4.69l3.28 1.97-.75 1.25-3.75-2.25A.75.75 0 0111 12.75V7.75h1.75z"/></svg> },
  confirmed: { label:'Booking approved', color:'#2563eb', bg:'#eff6ff',
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg> },
  active:    { label:'Vehicle entered',  color:'#16a34a', bg:'#f0fdf4',
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg> },
  completed: { label:'Vehicle exited',   color:'#7c3aed', bg:'#f5f3ff',
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg> },
  cancelled: { label:'Booking cancelled',color:'#dc2626', bg:'#fef2f2',
    icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg> },
};

function LiveActivityFeed({ parkingId }) {
  const [events, setEvents] = useState([]);

  const load = async () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const { data } = await supabase
      .from('reservations')
      .select('id, status, vehicle_number, updated_at, driver:users!reservations_user_id_fkey(name)')
      .eq('parking_id', parkingId)
      .gte('updated_at', today.toISOString())
      .order('updated_at', { ascending: false })
      .limit(6);
    setEvents(data || []);
  };

  useEffect(() => {
    if (!parkingId) return;
    load();
    const ch = supabase.channel(`feed-${parkingId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations', filter: `parking_id=eq.${parkingId}` }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [parkingId]);

  const cfg = (status) => EVENT_CONFIG[status] || EVENT_CONFIG.pending;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
          <p className="text-sm font-bold text-gray-800">Live Activity</p>
        </div>
        <p className="text-xs text-gray-400">Today</p>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <p className="text-xs text-gray-400">No activity yet today</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {events.map((e, i) => {
            const c = cfg(e.status);
            return (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                {/* Icon */}
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: c.bg, color: c.color }}>
                  {c.icon}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800">{c.label}</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    <span className="font-mono font-semibold text-gray-600">{e.vehicle_number}</span>
                    {e.driver?.name ? ` · ${e.driver.name}` : ''}
                  </p>
                </div>
                {/* Time */}
                <p className="text-[11px] text-gray-300 flex-shrink-0">{timeAgo(e.updated_at)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Occupancy Ring ────────────────────────────────────── */
function OccupancyRing({ available, total, size = 80 }) {
  const pct   = total > 0 ? ((total - available) / total) * 100 : 0;
  const r     = 30;
  const circ  = 2 * Math.PI * r;
  const used  = (pct / 100) * circ;
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f97316' : pct >= 50 ? '#eab308' : '#22c55e';
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8"/>
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${used} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 40 40)" style={{ transition:'stroke-dasharray 0.6s ease' }}/>
        <text x="40" y="38" textAnchor="middle" fontSize="13" fontWeight="800" fill={color}>{Math.round(pct)}%</text>
        <text x="40" y="53" textAnchor="middle" fontSize="8" fill="#94a3b8">occupancy</text>
      </svg>
    </div>
  );
}

/* ── Stat Card ─────────────────────────────────────────── */
function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background:`${color}15`, color }}>
        <Icon />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

/* ── Status config ─────────────────────────────────────── */
const STATUS = {
  pending:   { bg:'bg-amber-50',  text:'text-amber-700',  border:'border-amber-200',  dot:'bg-amber-500' },
  confirmed: { bg:'bg-blue-50',   text:'text-blue-700',   border:'border-blue-200',   dot:'bg-blue-500'  },
  active:    { bg:'bg-green-50',  text:'text-green-700',  border:'border-green-200',  dot:'bg-green-500' },
  completed: { bg:'bg-gray-100',  text:'text-gray-600',   border:'border-gray-200',   dot:'bg-gray-400'  },
  cancelled: { bg:'bg-red-50',    text:'text-red-600',    border:'border-red-200',    dot:'bg-red-400'   },
};

/* ── Reservation Card ──────────────────────────────────── */
function ReservationCard({ r, onAction }) {
  const cfg = STATUS[r.status] || STATUS.pending;
  const [loading, setLoading] = useState(null);

  const act = async (action) => {
    setLoading(action);
    try { await onAction(r.id, action); }
    finally { setLoading(null); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
      {/* Status top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
            #{String(r.id).padStart(4,'0')}
          </span>
          <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border capitalize ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>
            {r.status}
          </span>
        </div>
        <span className="text-xs text-gray-400">{formatDateTime(r.start_time)}</span>
      </div>

      <div className="p-5">
        {/* Driver info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
            {(r.driver?.name||'U').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">{r.driver?.name || '--'}</p>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {r.driver?.phone && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <I.Phone/> {r.driver.phone}
                </span>
              )}
              <span className="text-xs text-gray-400">{r.driver?.email}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-base font-extrabold text-indigo-600">{formatCurrency(r.total_amount)}</p>
          </div>
        </div>

        {/* Vehicle + time */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-xl px-3 py-2">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Vehicle</p>
            <p className="text-sm font-bold text-gray-800 font-mono">{r.vehicle_number}</p>
            <p className="text-xs text-gray-400 capitalize">{r.vehicle_type}</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Duration</p>
            <p className="text-xs font-semibold text-gray-700">{formatDateTime(r.start_time)}</p>
            <p className="text-xs text-gray-400">→ {formatDateTime(r.end_time)}</p>
          </div>
        </div>

        {/* Entry / Exit times */}
        {(r.entry_time || r.exit_time) && (
          <div className="flex gap-3 mb-4">
            {r.entry_time && (
              <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-2.5 py-1.5">
                <I.Enter/> Entered: {formatDateTime(r.entry_time)}
              </div>
            )}
            {r.exit_time && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                <I.Exit/> Exited: {formatDateTime(r.exit_time)}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {/* Pending → Approve / Reject */}
          {r.status === 'pending' && (
            <>
              <button onClick={() => act('approve')} disabled={!!loading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                style={{ background:'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow:'0 4px 12px rgba(34,197,94,0.3)' }}>
                {loading==='approve' ? '…' : <><I.Check/> Approve</>}
              </button>
              <button onClick={() => act('reject')} disabled={!!loading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                style={{ background:'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow:'0 4px 12px rgba(239,68,68,0.3)' }}>
                {loading==='reject' ? '…' : <><I.X/> Reject</>}
              </button>
            </>
          )}

          {/* Confirmed → Mark Entry */}
          {r.status === 'confirmed' && (
            <button onClick={() => act('entry')} disabled={!!loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ background:'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow:'0 4px 12px rgba(37,99,235,0.3)' }}>
              {loading==='entry' ? '…' : <><I.Enter/> Vehicle Entered</>}
            </button>
          )}

          {/* Active → Mark Exit */}
          {r.status === 'active' && (
            <button onClick={() => act('exit')} disabled={!!loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ background:'linear-gradient(135deg,#f97316,#ea580c)', boxShadow:'0 4px 12px rgba(249,115,22,0.3)' }}>
              {loading==='exit' ? '…' : <><I.Exit/> Vehicle Exited</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Dashboard ────────────────────────────────────── */
const TABS = [
  { key:'pending',   label:'Pending Approval', short:'Pending'   },
  { key:'confirmed', label:'Ready to Enter',   short:'Ready'     },
  { key:'active',    label:'Active / Inside',  short:'Active'    },
  { key:'exit',      label:'Mark Exit',        short:'Exit'      },
  { key:'all',       label:'All Reservations', short:'All'       },
];

export default function ManagerDashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [parking,  setParking]  = useState(null);
  const [stats,    setStats]    = useState(null);
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('pending');
  const [search,   setSearch]   = useState('');
  const [slots,    setSlots]    = useState(0);
  const [savingSlots, setSavingSlots] = useState(false);
  const [confirm,  setConfirm]  = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [view,     setView]     = useState('table'); // 'table' | 'card'

  /* ── Load ── */
  const load = useCallback(async () => {
    if (!user) return;
    try {
      const p = await managerService.getMyParking(user.id);
      if (!p) { setLoading(false); return; }
      setParking(p);
      setSlots(p.available_slots);

      const [s, r] = await Promise.all([
        managerService.getTodayStats(p.id),
        managerService.getParkingReservations(p.id, {
          status: tab === 'all' ? '' : tab === 'exit' ? 'active' : tab,
          search,
        }),
      ]);
      setStats(s);
      setItems(r.data);
    } finally { setLoading(false); setSpinning(false); }
  }, [user, tab, search]);

  useEffect(() => { load(); }, [tab]);

  // Real-time: auto-refresh + toast when new reservation arrives
  useEffect(() => {
    if (!parking) return;
    const ch = supabase
      .channel(`manager-realtime-${parking.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'reservations',
        filter: `parking_id=eq.${parking.id}`,
      }, (payload) => {
        toast('New reservation request!', {
          icon: '🔔',
          duration: 8000,
          style: { borderRadius: '12px', fontSize: '14px', fontFamily: 'Inter, sans-serif',
                   background: '#1e1b4b', color: '#fff' },
        });
        load();
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'reservations',
        filter: `parking_id=eq.${parking.id}`,
      }, () => { load(); })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [parking?.id]);

  const refresh = () => { setSpinning(true); load(); };

  /* ── Search ── */
  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  /* ── Actions ── */
  const handleAction = async (id, action) => {
    try {
      if (action === 'approve') {
        await managerService.approveReservation(id);
        toast.success('Reservation approved! Slot reserved for driver.');
      } else if (action === 'reject') {
        await managerService.rejectReservation(id);
        toast.success('Reservation rejected.');
      } else if (action === 'entry') {
        await managerService.markEntry(id);
        toast.success('Vehicle entry marked. Slot occupied!');
      } else if (action === 'exit') {
        await managerService.markExit(id);
        toast.success('Vehicle exit marked. Slot freed!');
      }
      load();
    } catch (err) { toast.error(err.message || 'Action failed.'); }
  };

  /* ── Slot update ── */
  const saveSlots = async () => {
    setSavingSlots(true);
    try {
      await managerService.updateSlots(parking.id, slots);
      setParking(p => ({ ...p, available_slots: slots }));
      toast.success('Slot count updated!');
    } catch (err) { toast.error(err.message || 'Failed.'); setSlots(parking.available_slots); }
    finally { setSavingSlots(false); }
  };

  /* ── No parking assigned ── */
  if (loading) return <PageLoader text="Loading your parking…"/>;

  if (!parking) return (
    <div className="min-h-screen" style={{ background:'#f8fafc' }}>
      <Navbar/>
      <div className="pt-16 flex items-center justify-center min-h-[80vh]">
        <div className="text-center max-w-sm px-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Parking Assigned</h2>
          <p className="text-gray-500 text-sm">You haven't been assigned to a parking location yet. Please contact your parking owner.</p>
        </div>
      </div>
    </div>
  );

  const pct = parking.total_slots > 0 ? Math.round(((parking.total_slots - slots) / parking.total_slots) * 100) : 0;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const isOpen = () => {
    if (!parking.opening_time || !parking.closing_time) return true;
    const [oh, om] = parking.opening_time.split(':').map(Number);
    const [ch, cm] = parking.closing_time.split(':').map(Number);
    const now = new Date().getHours() * 60 + new Date().getMinutes();
    const open = oh * 60 + om, close = ch * 60 + cm;
    return close < open ? (now >= open || now < close) : (now >= open && now < close);
  };

  const occupancyColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f97316' : pct >= 50 ? '#eab308' : '#22c55e';
  const open = isOpen();

  return (
    <div className="min-h-screen" style={{ background:'#f8fafc' }}>
      <Navbar/>
      <div>

        {/* ── Hero ── */}
        <div className="relative overflow-hidden"
          style={{ background:'linear-gradient(135deg,#0f0c29 0%,#1e1b4b 35%,#312e81 70%,#4f46e5 100%)' }}>

          {/* Decorative layers */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
              style={{ background:'radial-gradient(circle,#818cf8,transparent)', filter:'blur(40px)' }}/>
            <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full opacity-10"
              style={{ background:'radial-gradient(circle,#60a5fa,transparent)', filter:'blur(40px)' }}/>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
              style={{ background:'radial-gradient(circle,#a5b4fc,transparent)', filter:'blur(80px)' }}/>
            {/* Dot grid */}
            <div className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage:'radial-gradient(circle,#ffffff 1px,transparent 1px)', backgroundSize:'28px 28px' }}/>
            {/* Subtle horizontal rule */}
            <div className="absolute bottom-0 left-0 right-0 h-px opacity-20"
              style={{ background:'linear-gradient(90deg,transparent,#a5b4fc 40%,transparent)' }}/>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-0">

            {/* Top row: label + date + refresh */}
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
              <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
                Manager Dashboard
              </p>
              <div className="flex items-center gap-2">
                {/* Date chip */}
                <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-indigo-200 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  {new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}
                </div>
                {/* Refresh */}
                <button onClick={refresh} disabled={spinning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white/70 border border-white/20 hover:bg-white/10 transition-all disabled:opacity-40">
                  <span className={spinning ? 'animate-spin' : ''}><I.Refresh/></span>
                  Refresh
                </button>
              </div>
            </div>

            {/* Main title row */}
            <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
              <div>
                <p className="text-indigo-300 text-sm font-medium mb-1">
                  {greeting()}, {user?.name?.split(' ')[0]}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">{parking.name}</h1>
                  {/* Open / Closed badge */}
                  <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
                    open
                      ? 'bg-green-500/20 border-green-400/30 text-green-300'
                      : 'bg-red-500/20 border-red-400/30 text-red-300'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}/>
                    {open ? 'Open' : 'Closed'}
                  </span>
                </div>
                <p className="text-indigo-200/70 text-sm mt-1.5 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  {parking.address}
                </p>
              </div>

              {/* Occupancy ring — right side of hero */}
              <div className="hidden sm:flex flex-col items-center gap-1 bg-white/8 border border-white/10 rounded-2xl px-5 py-3">
                <OccupancyRing available={slots} total={parking.total_slots} size={72}/>
                <p className="text-xs text-indigo-300 font-medium mt-0.5">
                  {parking.total_slots - slots} / {parking.total_slots} occupied
                </p>
              </div>
            </div>

            {/* Stats strip + log button row */}
            <div className="flex flex-col gap-3 pb-5">
            <div className="grid grid-cols-5 gap-2">
              {[
                { label:'Pending',    value: stats?.pending   ?? 0, color:'#f59e0b', pulse: (stats?.pending   ?? 0) > 0 },
                { label:'Confirmed',  value: stats?.confirmed ?? 0, color:'#3b82f6', pulse: (stats?.confirmed ?? 0) > 0 },
                { label:'Active',     value: stats?.active    ?? 0, color:'#22c55e', pulse: false },
                { label:'Completed',  value: stats?.completed ?? 0, color:'#a78bfa', pulse: false },
                { label:'Free',       value: slots,                 color: occupancyColor, pulse: false },
              ].map(s => (
                <div key={s.label}
                  className="flex flex-col items-center gap-0.5 px-1 py-2 rounded-2xl"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}>
                  <div className="flex items-center gap-1">
                    {s.pulse && (
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
                        style={{ background: s.color }}/>
                    )}
                    <span className="text-base sm:text-xl font-extrabold" style={{ color: s.color }}>{s.value}</span>
                  </div>
                  <span className="text-[10px] text-white/45 font-medium whitespace-nowrap">{s.label}</span>
                </div>
              ))}
            </div>

              {/* Log button — full width on mobile, right-aligned on desktop */}
              <div className="flex justify-end">
                <Link to="/manager/reservations"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/80 border border-white/20 hover:bg-white/10 transition-all"
                  style={{ background:'rgba(255,255,255,0.08)', backdropFilter:'blur(8px)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                  View Reservation Log
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

          {/* Stats + Occupancy + Slot control */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Parking Status card */}
            <div className="rounded-2xl overflow-hidden shadow-sm"
              style={{ background:'linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#4338ca 100%)' }}>
              <div className="p-5">
                <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-4">Parking Status</p>

                {/* Ring + slot counter */}
                <div className="flex items-center gap-5 mb-4">
                  <OccupancyRing available={slots} total={parking.total_slots} size={80}/>
                  <div className="flex-1">
                    <p className="text-white/50 text-xs mb-1">{parking.total_slots - slots} occupied · {slots} free</p>
                    {/* Progress bar */}
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: parking.total_slots ? `${Math.round(((parking.total_slots - slots) / parking.total_slots) * 100)}%` : '0%',
                          background: occupancyColor,
                        }}/>
                    </div>
                    {/* +/- control */}
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSlots(s => Math.max(0,s-1))} disabled={slots<=0}
                        className="w-8 h-8 rounded-xl bg-white/10 hover:bg-red-500/30 text-white text-lg font-bold disabled:opacity-30 flex items-center justify-center transition-all border border-white/15">
                        −
                      </button>
                      <input type="number" min="0" max={parking.total_slots} value={slots}
                        onChange={e => setSlots(Math.max(0,Math.min(parking.total_slots,parseInt(e.target.value)||0)))}
                        className="flex-1 text-center text-xl font-extrabold text-white bg-white/10 border border-white/20 rounded-xl py-1.5 outline-none focus:border-indigo-300"/>
                      <button onClick={() => setSlots(s => Math.min(parking.total_slots,s+1))} disabled={slots>=parking.total_slots}
                        className="w-8 h-8 rounded-xl bg-white/10 hover:bg-green-500/30 text-white text-lg font-bold disabled:opacity-30 flex items-center justify-center transition-all border border-white/15">
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <button onClick={saveSlots} disabled={savingSlots || slots === parking.available_slots}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-indigo-900 bg-white hover:bg-indigo-50 transition-all disabled:opacity-40">
                  {savingSlots ? 'Saving…' : 'Update Available Slots'}
                </button>
              </div>
            </div>

            {/* Live Activity Feed */}
            <LiveActivityFeed parkingId={parking?.id}/>
          </div>

          {/* Search + Tabs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Search bar */}
            <div className="px-5 pt-4 pb-0 border-b border-gray-100">
              <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-50 transition-all">
                  <I.Search/>
                  <input
                    type="text"
                    placeholder="Search by driver name, vehicle number, phone or booking ID…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder-gray-400"
                  />
                  {search && (
                    <button type="button" onClick={() => { setSearch(''); load(); }} className="text-gray-400 hover:text-gray-600">
                      <I.X/>
                    </button>
                  )}
                </div>
                <button type="submit"
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                  Search
                </button>
              </form>

              {/* Tabs */}
              <div className="flex gap-1.5 p-1.5 bg-gray-50 mb-4 rounded-xl">
                {TABS.map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all
                      ${tab===t.key
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-gray-400 hover:text-gray-600'}`}>
                    <span className="sm:hidden">{t.short}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                    {t.key==='pending' && stats?.pending>0 && (
                      <span className="text-[10px] font-bold bg-amber-500 text-white px-1 rounded-full leading-4">
                        {stats.pending}
                      </span>
                    )}
                    {t.key==='confirmed' && stats?.confirmed>0 && (
                      <span className="text-[10px] font-bold bg-blue-500 text-white px-1 rounded-full leading-4 animate-pulse">
                        {stats.confirmed}
                      </span>
                    )}
                    {t.key==='active' && stats?.active>0 && (
                      <span className="text-[10px] font-bold bg-green-500 text-white px-1 rounded-full leading-4">
                        {stats.active}
                      </span>
                    )}
                    {t.key==='exit' && stats?.active>0 && (
                      <span className="text-[10px] font-bold bg-green-500 text-white px-1 rounded-full leading-4 animate-pulse">
                        {stats.active}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* View toggle + list */}
            <div className="px-5 pb-2 flex items-center justify-between">
              <p className="text-xs text-gray-400">{items.length} result{items.length !== 1 ? 's' : ''}</p>
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                <button onClick={() => setView('card')}
                  className={`p-1.5 rounded-md transition-all ${view === 'card' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                </button>
                <button onClick={() => setView('table')}
                  className={`p-1.5 rounded-md transition-all ${view === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
                </button>
              </div>
            </div>

            <div className="p-5 pt-3">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array(4).fill(0).map((_,i) => <div key={i} className="h-48 bg-gray-50 rounded-2xl animate-pulse"/>)}
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400">
                    {search ? `No results for "${search}"` : tab === 'exit' ? 'No active vehicles to exit' : `No ${tab === 'all' ? '' : tab} reservations`}
                  </p>
                  {search && (
                    <button onClick={() => { setSearch(''); load(); }} className="text-xs text-indigo-600 hover:underline">Clear search</button>
                  )}
                </div>
              ) : view === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map(r => <ReservationCard key={r.id} r={r} onAction={handleAction}/>)}
                </div>
              ) : (
                /* ── Table view ── */
                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="w-full" style={{ minWidth:'700px' }}>
                    <thead>
                      <tr style={{ background:'#fafbff' }}>
                        {['#','Driver','Vehicle','Period','Amount','Status','Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap border-b border-gray-100">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3.5">
                            <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                              #{String(r.id).padStart(4,'0')}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                                {(r.driver?.name||'U').charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate max-w-[120px]">{r.driver?.name||'—'}</p>
                                <p className="text-xs text-gray-400 truncate max-w-[120px]">{r.driver?.phone||r.driver?.email||''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg">{r.vehicle_number}</span>
                            <p className="text-[11px] text-gray-400 capitalize mt-0.5">{r.vehicle_type||''}</p>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <p className="text-xs text-gray-700">{formatDateTime(r.start_time)}</p>
                            <p className="text-xs text-gray-400 mt-0.5">→ {formatDateTime(r.end_time)}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="text-sm font-bold text-gray-900">{formatCurrency(r.total_amount)}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${
                              r.status==='pending'   ? 'bg-amber-50 border-amber-200 text-amber-700' :
                              r.status==='confirmed' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                              r.status==='active'    ? 'bg-green-50 border-green-200 text-green-700' :
                              r.status==='completed' ? 'bg-gray-100 border-gray-200 text-gray-600' :
                              'bg-red-50 border-red-200 text-red-600'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                r.status==='pending'?'bg-amber-400':r.status==='confirmed'?'bg-blue-500':
                                r.status==='active'?'bg-green-500':r.status==='completed'?'bg-gray-400':'bg-red-400'}`}/>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex gap-1.5 flex-nowrap">
                              {r.status==='pending' && <>
                                <button onClick={()=>handleAction(r.id,'reject')}
                                  className="px-2.5 py-1.5 text-[11px] font-bold text-white rounded-lg"
                                  style={{ background:'linear-gradient(135deg,#ef4444,#dc2626)' }}>Reject</button>
                                <button onClick={()=>handleAction(r.id,'approve')}
                                  className="px-2.5 py-1.5 text-[11px] font-bold text-white rounded-lg"
                                  style={{ background:'linear-gradient(135deg,#22c55e,#16a34a)' }}>Approve</button>
                              </>}
                              {r.status==='confirmed' && (
                                <button onClick={()=>handleAction(r.id,'entry')}
                                  className="px-2.5 py-1.5 text-[11px] font-bold text-white rounded-lg"
                                  style={{ background:'linear-gradient(135deg,#2563eb,#4f46e5)' }}>Entry</button>
                              )}
                              {r.status==='active' && (
                                <button onClick={()=>handleAction(r.id,'exit')}
                                  className="px-2.5 py-1.5 text-[11px] font-bold text-white rounded-lg"
                                  style={{ background:'linear-gradient(135deg,#059669,#10b981)' }}>Exit</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)}/>
    </div>
  );
}
