import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatDateTime, formatCurrency } from '../../utils/helpers';
import { downloadCSV, RESERVATION_COLUMNS } from '../../utils/csvExport';
import toast from 'react-hot-toast';

const LIMIT = 20;

const STATUS_CONFIG = {
  pending:   { bg:'bg-amber-50',  border:'border-amber-200',  text:'text-amber-700',  dot:'bg-amber-400'  },
  confirmed: { bg:'bg-blue-50',   border:'border-blue-200',   text:'text-blue-700',   dot:'bg-blue-500'   },
  active:    { bg:'bg-green-50',  border:'border-green-200',  text:'text-green-700',  dot:'bg-green-500'  },
  completed: { bg:'bg-gray-100',  border:'border-gray-200',   text:'text-gray-600',   dot:'bg-gray-400'   },
  cancelled: { bg:'bg-red-50',    border:'border-red-200',    text:'text-red-600',    dot:'bg-red-400'    },
};

const STATUSES = ['', 'pending', 'confirmed', 'active', 'completed', 'cancelled'];

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${c.bg} ${c.border} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>
      {status}
    </span>
  );
}

export default function ManagerReservations() {
  const { user } = useAuth();

  const [parking,   setParking]   = useState(null);
  const [rows,      setRows]      = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(1);
  const [status,    setStatus]    = useState('');
  const [search,    setSearch]    = useState('');
  const [fromDate,  setFromDate]  = useState('');
  const [toDate,    setToDate]    = useState('');
  const [exporting, setExporting] = useState(false);
  const [summary,   setSummary]   = useState(null);

  /* ── Fetch assigned parking ── */
  useEffect(() => {
    if (!user) return;
    supabase.from('parking_locations').select('*').eq('manager_id', user.id).single()
      .then(({ data }) => { setParking(data || null); setLoading(false); });
  }, [user]);

  /* ── Load reservations ── */
  const load = useCallback(async (p = 1, st = status, q = search, from = fromDate, to = toDate) => {
    if (!parking) return;
    setLoading(true);
    try {
      let query = supabase
        .from('reservations')
        .select('*, driver:users!reservations_user_id_fkey(id,name,email,phone)', { count: 'exact' })
        .eq('parking_id', parking.id)
        .order('created_at', { ascending: false })
        .range((p - 1) * LIMIT, p * LIMIT - 1);

      if (st)   query = query.eq('status', st);
      if (from) query = query.gte('created_at', from);
      if (to)   query = query.lte('created_at', to + 'T23:59:59');

      const { data, count: c, error } = await query;
      if (error) throw error;

      // Client-side search
      let results = data || [];
      if (q.trim()) {
        const lq = q.trim().toLowerCase();
        results = results.filter(r =>
          r.vehicle_number?.toLowerCase().includes(lq) ||
          r.driver?.name?.toLowerCase().includes(lq) ||
          r.driver?.email?.toLowerCase().includes(lq) ||
          r.driver?.phone?.toLowerCase().includes(lq) ||
          String(r.id).includes(lq)
        );
      }

      setRows(results);
      setTotal(c || 0);
      setPage(p);
    } catch (err) { toast.error(err.message || 'Failed to load.'); }
    finally { setLoading(false); }
  }, [parking, status, search, fromDate, toDate]);

  /* ── Summary stats ── */
  const loadSummary = useCallback(async () => {
    if (!parking) return;
    const { data } = await supabase
      .from('reservations')
      .select('status, total_amount')
      .eq('parking_id', parking.id);

    const all = data || [];
    const revenue   = all.filter(r => ['completed','active'].includes(r.status))
                         .reduce((s, r) => s + parseFloat(r.total_amount || 0), 0);
    const completed = all.filter(r => r.status === 'completed').length;
    const rate      = all.length ? Math.round((completed / all.length) * 100) : 0;
    setSummary({ total: all.length, revenue, completed, rate,
      pending: all.filter(r => r.status === 'pending').length,
      active:  all.filter(r => r.status === 'active').length,
    });
  }, [parking]);

  useEffect(() => { if (parking) { load(); loadSummary(); } }, [parking]);

  /* ── Export all matching rows ── */
  const handleExport = async () => {
    if (!parking) return;
    setExporting(true);
    try {
      let query = supabase
        .from('reservations')
        .select('*, driver:users!reservations_user_id_fkey(id,name,email,phone)')
        .eq('parking_id', parking.id)
        .order('created_at', { ascending: false });

      if (status)   query = query.eq('status', status);
      if (fromDate) query = query.gte('created_at', fromDate);
      if (toDate)   query = query.lte('created_at', toDate + 'T23:59:59');

      const { data } = await query;
      const rows = (data || []).map(r => ({ ...r, parking: { name: parking.name } }));
      downloadCSV(rows, RESERVATION_COLUMNS, `reservations-${parking.name.replace(/\s+/g,'-')}-${new Date().toISOString().slice(0,10)}.csv`);
      toast.success(`Exported ${rows.length} rows.`);
    } catch { toast.error('Export failed.'); }
    finally { setExporting(false); }
  };

  const clearFilters = () => {
    setStatus(''); setSearch(''); setFromDate(''); setToDate('');
    load(1, '', '', '', '');
  };

  const hasFilters = status || search || fromDate || toDate;
  const pages = Math.ceil(total / LIMIT);

  /* ── Guard: no parking ── */
  if (!loading && !parking) return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      <Navbar />
      <div className="pt-16 flex items-center justify-center min-h-[80vh]">
        <div className="text-center max-w-sm px-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Parking Assigned</h2>
          <p className="text-sm text-gray-500">Contact your owner to get assigned to a location.</p>
        </div>
      </div>
    </div>
  );

  if (loading && !parking) return <PageLoader text="Loading…" />;

  return (
    <div className="min-h-screen pb-20" style={{ background: '#f8fafc' }}>
      <Navbar />

      {/* ── Hero ── */}
      <div className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#0f0c29 0%,#1e1b4b 35%,#312e81 70%,#4f46e5 100%)' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle,#818cf8,transparent)', filter: 'blur(40px)' }}/>
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'radial-gradient(circle,#ffffff 1px,transparent 1px)', backgroundSize: '28px 28px' }}/>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-6">
          {/* Back link */}
          <Link to="/manager" className="inline-flex items-center gap-1.5 text-indigo-300 text-sm hover:text-white transition-colors mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            Manager Dashboard
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div>
              <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1">Reservation Log</p>
              <h1 className="text-3xl font-extrabold text-white">{parking?.name}</h1>
              <p className="text-indigo-200/70 text-sm mt-1 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                </svg>
                {parking?.address}
              </p>
            </div>

            {/* Export button */}
            <button onClick={handleExport} disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white border border-white/20 hover:bg-white/10 transition-all disabled:opacity-40">
              {exporting
                ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              }
              Export CSV
            </button>
          </div>

          {/* Summary stat cards */}
          {summary && (
            <div className="flex items-center gap-3 pb-6 overflow-x-auto">
              {[
                { label: 'Total',       value: summary.total,                color: '#a5b4fc' },
                { label: 'Revenue',     value: formatCurrency(summary.revenue), color: '#34d399' },
                { label: 'Completed',   value: summary.completed,            color: '#a78bfa' },
                { label: 'Completion',  value: `${summary.rate}%`,           color: '#fbbf24' },
                { label: 'Pending',     value: summary.pending,              color: '#f59e0b' },
                { label: 'Active Now',  value: summary.active,               color: '#22c55e' },
              ].map(s => (
                <div key={s.label} className="flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                           backdropFilter: 'blur(12px)', minWidth: '80px' }}>
                  <span className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</span>
                  <span className="text-[11px] text-white/45 font-medium whitespace-nowrap">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">

        {/* Filters row */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">

          {/* Status tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {STATUSES.map(s => (
              <button key={s} onClick={() => { setStatus(s); load(1, s, search, fromDate, toDate); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all flex-shrink-0 ${
                  status === s
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'text-gray-500 border-gray-200 hover:border-indigo-200 hover:text-indigo-600'}`}>
                {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
              </button>
            ))}
          </div>

          {/* Search + date range */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" placeholder="Search driver, vehicle, ID…"
                value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && load(1)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"/>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="py-2.5 px-3 text-sm rounded-xl border border-gray-200 outline-none focus:border-indigo-400 transition-all text-gray-600"/>
              <span className="text-gray-400 text-sm">→</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="py-2.5 px-3 text-sm rounded-xl border border-gray-200 outline-none focus:border-indigo-400 transition-all text-gray-600"/>
            </div>
            <button onClick={() => load(1)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg,#6366f1,#2563eb)' }}>
              Apply
            </button>
            {hasFilters && (
              <button onClick={clearFilters}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 border border-gray-200 hover:border-gray-300 transition-all">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {Array(8).fill(0).map((_,i) => (
              <div key={i} className="flex gap-4 px-5 py-4 border-b border-gray-50">
                {Array(6).fill(0).map((_,j) => (
                  <div key={j} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${[10,18,14,12,16,10][j]}%` }}/>
                ))}
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
              </svg>
            </div>
            <p className="text-sm text-gray-500">No reservations match your filters.</p>
            {hasFilters && <button onClick={clearFilters} className="text-xs text-indigo-600 hover:underline">Clear filters</button>}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100" style={{ background: '#f8fafc' }}>
              <p className="text-xs font-bold text-gray-500">
                {hasFilters ? `${rows.length} result${rows.length !== 1 ? 's' : ''} (filtered)` : `${total} total reservation${total !== 1 ? 's' : ''}`}
              </p>
              <p className="text-xs text-gray-400">Page {page} of {pages || 1}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100" style={{ background: '#fafbff' }}>
                    {['#', 'Driver', 'Vehicle', 'Period', 'Entry / Exit', 'Amount', 'Status'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* ID */}
                      <td className="px-5 py-4">
                        <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                          #{String(r.id).padStart(4, '0')}
                        </span>
                      </td>
                      {/* Driver */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                            {(r.driver?.name || 'U').charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{r.driver?.name || '—'}</p>
                            <p className="text-xs text-gray-400 truncate">{r.driver?.phone || r.driver?.email || ''}</p>
                          </div>
                        </div>
                      </td>
                      {/* Vehicle */}
                      <td className="px-5 py-4">
                        <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg">{r.vehicle_number}</span>
                        <p className="text-[11px] text-gray-400 capitalize mt-0.5">{r.vehicle_type || ''}</p>
                      </td>
                      {/* Period */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-xs text-gray-700">{formatDateTime(r.start_time)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">→ {formatDateTime(r.end_time)}</p>
                      </td>
                      {/* Entry / Exit */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {r.entry_time
                          ? <p className="text-xs text-green-700 font-medium">{formatDateTime(r.entry_time)}</p>
                          : <p className="text-xs text-gray-300">—</p>}
                        {r.exit_time
                          ? <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(r.exit_time)}</p>
                          : null}
                      </td>
                      {/* Amount */}
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(r.total_amount)}</p>
                      </td>
                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100" style={{ background: '#f8fafc' }}>
                <p className="text-xs text-gray-400">
                  Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => load(page - 1)} disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg text-sm text-gray-500 border border-gray-200 hover:bg-white disabled:opacity-30 transition-all">←</button>
                  <span className="px-3 py-1.5 text-sm text-gray-600 font-medium">{page} / {pages}</span>
                  <button onClick={() => load(page + 1)} disabled={page >= pages}
                    className="px-3 py-1.5 rounded-lg text-sm text-gray-500 border border-gray-200 hover:bg-white disabled:opacity-30 transition-all">→</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
