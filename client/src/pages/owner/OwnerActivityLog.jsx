import { useState, useEffect, useRef } from 'react';
import OwnerLayout from '../../components/owner/OwnerLayout';
import { ACTION_META } from '../../services/activityService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime, timeAgo, getInitials } from '../../utils/helpers';

/* ── Category filter options (owner-relevant only) ──────── */
const FILTERS = [
  { key: '',            label: 'All Activity'   },
  { key: 'reservation', label: 'Reservations'   },
  { key: 'parking',     label: 'Parking'        },
  { key: 'manager',     label: 'Managers'       },
];

/* ── Action icon map ────────────────────────────────────── */
const ActionIcon = ({ action, color }) => {
  const icons = {
    'reservation.created':    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>,
    'reservation.cancelled':  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>,
    'reservation.entry':      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14"/>,
    'reservation.exit':       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>,
    'parking.created':        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5"/>,
    'parking.updated':        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>,
    'parking.approved':       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>,
    'parking.rejected':       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>,
    'parking.deleted':        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>,
    'manager.assigned':       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>,
    'manager.removed':        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zm7-6l5 5m0-5l-5 5"/>,
  };
  return (
    <svg className="w-4 h-4" fill="none" stroke={color || 'currentColor'} viewBox="0 0 24 24">
      {icons[action] || <circle cx="12" cy="12" r="10" strokeWidth={2}/>}
    </svg>
  );
};

/* ── Build human-readable sentence ──────────────────────── */
const describe = (entry) => {
  const meta = entry.meta || {};
  const actor = entry.actor?.name || 'Someone';
  const bold = (t) => <span className="font-semibold text-gray-900">{t}</span>;

  switch (entry.action) {
    case 'reservation.created':   return <>{bold(actor)} booked a spot for {bold(meta.vehicle_number)} at {bold(meta.parking_name)}</>;
    case 'reservation.cancelled': return <>{bold(actor)} cancelled reservation #{bold(entry.entity_id)} ({meta.vehicle_number})</>;
    case 'reservation.entry':     return <>{bold(actor)} checked in {bold(meta.vehicle_number)} at {bold(meta.parking_name)}</>;
    case 'reservation.exit':      return <>{bold(actor)} checked out {bold(meta.vehicle_number)} from {bold(meta.parking_name)}</>;
    case 'parking.created':       return <>{bold(actor)} added {bold(meta.parking_name)}</>;
    case 'parking.updated':       return <>{bold(actor)} updated {bold(meta.parking_name)}</>;
    case 'parking.approved':      return <>Admin approved {bold(meta.parking_name)}</>;
    case 'parking.rejected':      return <>Admin rejected {bold(meta.parking_name)}</>;
    case 'parking.deleted':       return <>{bold(actor)} deleted {bold(meta.parking_name)}</>;
    case 'manager.assigned':      return <>{bold(actor)} assigned {bold(meta.manager_name)} to manage {bold(meta.parking_name)}</>;
    case 'manager.removed':       return <>{bold(actor)} removed the manager from {bold(meta.parking_name)}</>;
    default:                      return <>{bold(actor)} performed {entry.action}</>;
  }
};

/* ── Skeleton ───────────────────────────────────────────── */
const Sk = () => (
  <div className="flex gap-4 py-4 px-6">
    <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse flex-shrink-0"/>
    <div className="flex-1 space-y-2 pt-1">
      <div className="h-3.5 bg-gray-100 rounded animate-pulse w-3/4"/>
      <div className="h-3 bg-gray-50 rounded animate-pulse w-1/3"/>
    </div>
  </div>
);

/* ── Main ───────────────────────────────────────────────── */
export default function OwnerActivityLog() {
  const { user }   = useAuth();
  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [filter,   setFilter]   = useState('');
  const [live,     setLive]     = useState(true);
  const timerRef = useRef(null);
  const LIMIT = 25;

  const OWNER_ACTIONS = {
    reservation: ['reservation.created','reservation.cancelled','reservation.entry','reservation.exit'],
    parking:     ['parking.created','parking.updated','parking.approved','parking.rejected','parking.deleted'],
    manager:     ['manager.assigned','manager.removed'],
  };

  const load = async (p = 1, cat = filter) => {
    setLoading(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select('*, actor:users!activity_logs_actor_id_fkey(name, email, role)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((p - 1) * LIMIT, p * LIMIT - 1);

      if (cat && OWNER_ACTIONS[cat]) {
        query = query.in('action', OWNER_ACTIONS[cat]);
      }

      const { data, count } = await query;
      setLogs(data || []);
      setTotal(count || 0);
      setPage(p);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!live) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => load(1, filter), 20000);
    return () => clearInterval(timerRef.current);
  }, [live, filter]);

  const handleFilter = (cat) => { setFilter(cat); load(1, cat); };

  // Group by date
  const grouped = logs.reduce((acc, log) => {
    const date = new Date(log.created_at).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  return (
    <OwnerLayout title="Activity Log" subtitle="Everything happening across your parking locations">

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => handleFilter(f.key)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all
                  ${filter === f.key
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-200 hover:text-indigo-600'}`}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{total} events</span>
            <button onClick={() => setLive(l => !l)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                live ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}/>
              {live ? 'Live' : 'Paused'}
            </button>
            <button onClick={() => load(1, filter)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all">
              Refresh
            </button>
          </div>
        </div>

        {/* Timeline card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-50">{Array(6).fill(0).map((_, i) => <Sk key={i}/>)}</div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <p className="text-sm text-gray-400">No activity yet</p>
            </div>
          ) : (
            <>
              {Object.entries(grouped).map(([date, entries]) => (
                <div key={date}>
                  {/* Date header */}
                  <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-2.5 bg-gray-50/90 backdrop-blur-sm border-y border-gray-100">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{date}</span>
                    <span className="text-xs text-gray-300">{entries.length} event{entries.length !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {entries.map(entry => {
                      const m = ACTION_META[entry.action] || { color:'#6b7280', bg:'#f9fafb' };
                      return (
                        <div key={entry.id}
                          className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors group">

                          {/* Icon */}
                          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
                            style={{ background: m.bg, border: `1.5px solid ${m.color}22` }}>
                            <ActionIcon action={entry.action} color={m.color}/>
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-600 leading-relaxed">{describe(entry)}</p>

                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {entry.actor && (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-4 h-4 rounded-full text-white text-[8px] font-bold flex items-center justify-center"
                                      style={{ background: 'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                                      {getInitials(entry.actor.name)}
                                    </div>
                                    <span className="text-xs text-gray-400">{entry.actor.name}</span>
                                  </div>
                                  <span className="text-gray-200">·</span>
                                </>
                              )}
                              <span className="text-xs text-gray-400" title={formatDateTime(entry.created_at)}>
                                {timeAgo(entry.created_at)}
                              </span>
                            </div>
                          </div>

                          {/* Color dot */}
                          <div className="flex-shrink-0 mt-2.5">
                            <div className="w-1.5 h-1.5 rounded-full opacity-40 group-hover:opacity-100 transition-opacity"
                              style={{ background: m.color }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {total > LIMIT && (
                <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-400">
                    Showing {(page-1)*LIMIT+1}–{Math.min(page*LIMIT, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => load(page-1)} disabled={page===1}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-white disabled:opacity-30 transition-all">←</button>
                    <button onClick={() => load(page+1)} disabled={page>=Math.ceil(total/LIMIT)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-white disabled:opacity-30 transition-all">→</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </OwnerLayout>
  );
}
