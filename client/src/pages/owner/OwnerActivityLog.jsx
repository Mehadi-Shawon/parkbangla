import { useState, useEffect, useRef } from 'react';
import OwnerLayout from '../../components/owner/OwnerLayout';
import { ACTION_META } from '../../services/activityService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime, timeAgo, getInitials } from '../../utils/helpers';
import { downloadCSV } from '../../utils/csvExport';
import toast from 'react-hot-toast';

const FILTERS = [
  { key: '',            label: 'All'          },
  { key: 'reservation', label: 'Reservations' },
  { key: 'parking',     label: 'Parking'      },
  { key: 'manager',     label: 'Managers'     },
];

const OWNER_ACTIONS = {
  reservation: ['reservation.created','reservation.cancelled','reservation.entry','reservation.exit'],
  parking:     ['parking.created','parking.updated','parking.approved','parking.rejected','parking.deleted'],
  manager:     ['manager.assigned','manager.removed'],
};

const ACTION_LABELS = {
  'reservation.created':   'Booking created',
  'reservation.cancelled': 'Booking cancelled',
  'reservation.entry':     'Vehicle entered',
  'reservation.exit':      'Vehicle exited',
  'parking.created':       'Parking added',
  'parking.updated':       'Parking updated',
  'parking.approved':      'Parking approved',
  'parking.rejected':      'Parking rejected',
  'parking.deleted':       'Parking deleted',
  'manager.assigned':      'Manager assigned',
  'manager.removed':       'Manager removed',
};

/* ── Action icon ────────────────────────────────────────── */
const ActionIcon = ({ action, color }) => {
  const paths = {
    'reservation.created':   'M12 4v16m8-8H4',
    'reservation.cancelled': 'M6 18L18 6M6 6l12 12',
    'reservation.entry':     'M11 16l-4-4m0 0l4-4m-4 4h14',
    'reservation.exit':      'M13 7l5 5m0 0l-5 5m5-5H6',
    'parking.created':       'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5',
    'parking.updated':       'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    'parking.approved':      'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    'parking.rejected':      'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    'parking.deleted':       'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    'manager.assigned':      'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
    'manager.removed':       'M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zm7-6l5 5m0-5l-5 5',
  };
  return (
    <svg className="w-4 h-4" fill="none" stroke={color || 'currentColor'} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={paths[action] || 'M12 12'}/>
    </svg>
  );
};

/* ── Human-readable sentence ────────────────────────────── */
const describe = (entry) => {
  const meta  = entry.meta || {};
  const actor = entry.actor?.name || 'Someone';
  const B = (t) => <span className="font-semibold text-gray-900">{t}</span>;
  switch (entry.action) {
    case 'reservation.created':   return <>{B(actor)} booked a spot for {B(meta.vehicle_number)} at {B(meta.parking_name)}</>;
    case 'reservation.cancelled': return <>{B(actor)} cancelled booking #{entry.entity_id} ({meta.vehicle_number})</>;
    case 'reservation.entry':     return <>{B(actor)} checked in {B(meta.vehicle_number)} at {B(meta.parking_name)}</>;
    case 'reservation.exit':      return <>{B(actor)} checked out {B(meta.vehicle_number)} from {B(meta.parking_name)}</>;
    case 'parking.created':       return <>{B(actor)} added parking {B(meta.parking_name)}</>;
    case 'parking.updated':       return <>{B(actor)} updated {B(meta.parking_name)}</>;
    case 'parking.approved':      return <>Admin approved {B(meta.parking_name)}</>;
    case 'parking.rejected':      return <>Admin rejected {B(meta.parking_name)}</>;
    case 'parking.deleted':       return <>{B(actor)} deleted {B(meta.parking_name)}</>;
    case 'manager.assigned':      return <>{B(actor)} assigned {B(meta.manager_name)} to manage {B(meta.parking_name)}</>;
    case 'manager.removed':       return <>{B(actor)} removed the manager from {B(meta.parking_name)}</>;
    default:                      return <>{B(actor)} performed {entry.action}</>;
  }
};

const describeText = (entry) => {
  const meta  = entry.meta || {};
  const actor = entry.actor?.name || 'Someone';
  switch (entry.action) {
    case 'reservation.created':   return `${actor} booked a spot for ${meta.vehicle_number} at ${meta.parking_name}`;
    case 'reservation.cancelled': return `${actor} cancelled booking #${entry.entity_id}`;
    case 'reservation.entry':     return `${actor} checked in ${meta.vehicle_number} at ${meta.parking_name}`;
    case 'reservation.exit':      return `${actor} checked out ${meta.vehicle_number} from ${meta.parking_name}`;
    case 'parking.created':       return `${actor} added parking ${meta.parking_name}`;
    case 'parking.updated':       return `${actor} updated ${meta.parking_name}`;
    case 'parking.approved':      return `Admin approved ${meta.parking_name}`;
    case 'parking.rejected':      return `Admin rejected ${meta.parking_name}`;
    case 'parking.deleted':       return `${actor} deleted ${meta.parking_name}`;
    case 'manager.assigned':      return `${actor} assigned ${meta.manager_name} to manage ${meta.parking_name}`;
    case 'manager.removed':       return `${actor} removed the manager from ${meta.parking_name}`;
    default:                      return `${actor} performed ${entry.action}`;
  }
};

const Sk = () => (
  <div className="flex gap-3 py-4 px-4 sm:px-6">
    <div className="w-9 h-9 rounded-2xl bg-gray-100 animate-pulse flex-shrink-0"/>
    <div className="flex-1 space-y-2 pt-1">
      <div className="h-3.5 bg-gray-100 rounded animate-pulse w-3/4"/>
      <div className="h-3 bg-gray-50 rounded animate-pulse w-1/3"/>
    </div>
  </div>
);

export default function OwnerActivityLog() {
  const { user }   = useAuth();
  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [filter,   setFilter]   = useState('');
  const [live,     setLive]     = useState(true);
  const [exporting,setExporting]= useState(false);
  const [search,   setSearch]   = useState('');
  const timerRef = useRef(null);
  const LIMIT = 25;

  const load = async (p = 1, cat = filter) => {
    setLoading(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select('*, actor:users!activity_logs_actor_id_fkey(name, email, role)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((p - 1) * LIMIT, p * LIMIT - 1);
      if (cat && OWNER_ACTIONS[cat]) query = query.in('action', OWNER_ACTIONS[cat]);
      const { data, count } = await query;
      setLogs(data || []); setTotal(count || 0); setPage(p);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!live) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => load(1, filter), 20000);
    return () => clearInterval(timerRef.current);
  }, [live, filter]);

  const handleFilter = (cat) => { setFilter(cat); load(1, cat); };

  const handleExport = async () => {
    setExporting(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select('*, actor:users!activity_logs_actor_id_fkey(name, email, role)')
        .order('created_at', { ascending: false });
      if (filter && OWNER_ACTIONS[filter]) query = query.in('action', OWNER_ACTIONS[filter]);
      const { data } = await query;
      const rows = (data || []).map(e => ({
        date:        new Date(e.created_at).toLocaleString(),
        action:      ACTION_LABELS[e.action] || e.action,
        description: describeText(e),
        actor:       e.actor?.name || '—',
        actor_email: e.actor?.email || '—',
        actor_role:  e.actor?.role || '—',
      }));
      downloadCSV(rows, [
        { label:'Date/Time',    value: r => r.date        },
        { label:'Action',       value: r => r.action      },
        { label:'Description',  value: r => r.description },
        { label:'Actor',        value: r => r.actor       },
        { label:'Email',        value: r => r.actor_email },
        { label:'Role',         value: r => r.actor_role  },
      ], `activity-log-${new Date().toISOString().slice(0,10)}.csv`);
      toast.success(`Exported ${rows.length} events.`);
    } catch { toast.error('Export failed.'); }
    finally { setExporting(false); }
  };

  const filtered = search.trim()
    ? logs.filter(l => describeText(l).toLowerCase().includes(search.toLowerCase()) ||
        l.actor?.name?.toLowerCase().includes(search.toLowerCase()) ||
        l.actor?.email?.toLowerCase().includes(search.toLowerCase()))
    : logs;

  const grouped = filtered.reduce((acc, log) => {
    const date = new Date(log.created_at).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  return (
    <OwnerLayout title="Activity Log" subtitle="Everything happening across your parking locations">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">

        {/* Controls */}
        <div className="space-y-3 mb-5">

          {/* Filter tabs — segmented */}
          <div className="flex gap-1 p-1.5 bg-gray-100 rounded-full">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => handleFilter(f.key)}
                className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all text-center ${
                  filter === f.key ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                style={filter === f.key ? { background:'linear-gradient(135deg,#6366f1,#2563eb)' } : {}}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="text" placeholder="Search by actor, vehicle, parking name…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"/>
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            )}
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-400">{total} event{total !== 1 ? 's' : ''}</p>
            <div className="flex items-center gap-2">
              {/* Live toggle */}
              <button onClick={() => setLive(l => !l)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  live ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}/>
                {live ? 'Live' : 'Paused'}
              </button>
              {/* Refresh */}
              <button onClick={() => load(1, filter)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              </button>
              {/* Export CSV */}
              <button onClick={handleExport} disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:text-indigo-600 hover:border-indigo-200 transition-all disabled:opacity-40">
                {exporting
                  ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                }
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-50">{Array(6).fill(0).map((_, i) => <Sk key={i}/>)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-500">
                {search ? `No results for "${search}"` : 'No activity yet'}
              </p>
              <p className="text-xs text-gray-400">
                {search ? 'Try a different search term' : 'Actions across your locations will appear here'}
              </p>
              {search && (
                <button onClick={() => setSearch('')} className="text-xs text-indigo-600 hover:underline">Clear search</button>
              )}
            </div>
          ) : (
            <>
              {Object.entries(grouped).map(([date, entries]) => (
                <div key={date}>
                  {/* Date header */}
                  <div className="sticky top-0 z-10 flex items-center gap-3 px-4 sm:px-6 py-2.5 border-y border-gray-100"
                    style={{ background:'rgba(249,250,251,0.95)', backdropFilter:'blur(8px)' }}>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{date}</span>
                    <span className="text-[11px] text-gray-300 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                      {entries.length} event{entries.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {entries.map(entry => {
                      const m = ACTION_META[entry.action] || { color:'#6b7280', bg:'#f9fafb' };
                      return (
                        <div key={entry.id}
                          className="flex items-start gap-3 px-4 sm:px-6 py-4 hover:bg-gray-50/60 transition-colors">

                          {/* Icon bubble */}
                          <div className="flex-shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center mt-0.5"
                            style={{ background: m.bg, border:`1.5px solid ${m.color}25` }}>
                            <ActionIcon action={entry.action} color={m.color}/>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-600 leading-snug">{describe(entry)}</p>

                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {entry.actor && (
                                <>
                                  <div className="flex items-center gap-1">
                                    <div className="w-4 h-4 rounded-full text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0"
                                      style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                                      {getInitials(entry.actor.name)}
                                    </div>
                                    <span className="text-xs text-gray-400">{entry.actor.name}</span>
                                  </div>
                                  <span className="text-gray-200 text-xs">·</span>
                                </>
                              )}
                              <span className="text-xs text-gray-400" title={formatDateTime(entry.created_at)}>
                                {timeAgo(entry.created_at)}
                              </span>
                              {/* Action badge */}
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                style={{ background: m.bg, color: m.color }}>
                                {ACTION_LABELS[entry.action] || entry.action}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {total > LIMIT && (
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-t border-gray-100 bg-gray-50/50">
                  <p className="text-xs text-gray-400">
                    {(page-1)*LIMIT+1}–{Math.min(page*LIMIT, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => load(page-1)} disabled={page===1}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-white disabled:opacity-30 transition-all">←</button>
                    <span className="px-3 py-1.5 text-sm text-gray-500 font-medium">{page}/{Math.ceil(total/LIMIT)}</span>
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
