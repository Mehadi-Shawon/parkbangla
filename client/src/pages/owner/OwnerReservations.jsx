import { useState, useEffect } from 'react';
import OwnerLayout from '../../components/owner/OwnerLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import * as parkingService from '../../services/parkingService';
import * as reservationService from '../../services/reservationService';
import { supabase } from '../../lib/supabase';
import { log } from '../../services/activityService';
import { formatDateTime, formatCurrency } from '../../utils/helpers';
import { downloadCSV, RESERVATION_COLUMNS } from '../../utils/csvExport';
import toast from 'react-hot-toast';

const STATUSES = ['','pending','confirmed','active','completed','cancelled'];
const LIMIT    = 15;

const STATUS_CONFIG = {
  confirmed: { bg:'bg-blue-50',   border:'border-blue-100',   text:'text-blue-700',   dot:'bg-blue-500' },
  active:    { bg:'bg-green-50',  border:'border-green-100',  text:'text-green-700',  dot:'bg-green-500' },
  completed: { bg:'bg-gray-100',  border:'border-gray-200',   text:'text-gray-600',   dot:'bg-gray-400' },
  cancelled: { bg:'bg-red-50',    border:'border-red-100',    text:'text-red-600',    dot:'bg-red-400' },
  pending:   { bg:'bg-amber-50',  border:'border-amber-100',  text:'text-amber-700',  dot:'bg-amber-400' },
};

const StatusBadge = ({ status }) => {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${c.bg} ${c.border} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>
      {status}
    </span>
  );
};

export default function OwnerReservations() {
  const { user }   = useAuth();
  const [parkingIds,    setParkingIds]    = useState([]);
  const [reservations,  setReservations]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState('');
  const [search,        setSearch]        = useState('');
  const [fromDate,      setFromDate]      = useState('');
  const [toDate,        setToDate]        = useState('');
  const [page,          setPage]          = useState(1);
  const [total,         setTotal]         = useState(0);
  const [actioning,     setActioning]     = useState(null);
  const [exporting,     setExporting]     = useState(false);
  const [summary,       setSummary]       = useState(null);
  const [statsBar,      setStatsBar]      = useState({ confirmed:0, active:0, completed:0 });

  useEffect(() => {
    if (!user) return;
    parkingService.getOwnerParkings(user.id).then(p => {
      const ids = p.map(x => x.id);
      setParkingIds(ids);
      // Load summary
      supabase.from('reservations').select('status, total_amount').in('parking_id', ids)
        .then(({ data: all }) => {
          const a = all || [];
          setSummary({
            total:    a.length,
            revenue:  a.filter(r=>['completed','active'].includes(r.status)).reduce((s,r)=>s+parseFloat(r.total_amount||0),0),
            completed:a.filter(r=>r.status==='completed').length,
            pending:  a.filter(r=>r.status==='pending').length,
            rate:     a.length ? Math.round((a.filter(r=>r.status==='completed').length/a.length)*100) : 0,
          });
        });
      return reservationService.getOwnerReservations({ parkingIds: ids, page:1, limit: LIMIT });
    }).then(({ data, total: t }) => {
      setReservations(data); setTotal(t);
      setStatsBar({
        confirmed: data.filter(r=>r.status==='confirmed').length,
        active:    data.filter(r=>r.status==='active').length,
        completed: data.filter(r=>r.status==='completed').length,
      });
    }).finally(() => setLoading(false));
  }, [user]);

  const load = async (p=1, status=filter, q=search, from=fromDate, to=toDate) => {
    setLoading(true);
    try {
      const { data, total: t } = await reservationService.getOwnerReservations({ parkingIds, status, search: q, page:p, limit:LIMIT });
      setReservations(data); setTotal(t); setPage(p);
    } catch { toast.error('Failed to load.'); }
    finally  { setLoading(false); }
  };

  const handleFilter = s => { setFilter(s); load(1, s, search); };

  const handleSearch = (e) => {
    e.preventDefault();
    load(1, filter, search);
  };

  const clearSearch = () => { setSearch(''); setFromDate(''); setToDate(''); load(1, filter, '', '', ''); };

  const handleExport = async () => {
    if (!parkingIds.length) return;
    setExporting(true);
    try {
      const { data } = await supabase
        .from('reservations')
        .select('*, driver:users!reservations_user_id_fkey(name,email,phone), parking:parking_locations(name)')
        .in('parking_id', parkingIds)
        .order('created_at', { ascending: false });
      downloadCSV(data || [], RESERVATION_COLUMNS, `reservations-${new Date().toISOString().slice(0,10)}.csv`);
      toast.success(`Exported ${(data||[]).length} rows.`);
    } catch { toast.error('Export failed.'); }
    finally { setExporting(false); }
  };

  const handleAction = async (id, action) => {
    setActioning(id);
    try {
      if (action === 'approve') {
        const { error } = await supabase.rpc('manager_approve_reservation', { p_reservation_id: id });
        if (error) throw error;
        toast.success('Reservation approved!');
      } else if (action === 'reject') {
        const { error } = await supabase.rpc('manager_reject_reservation', { p_reservation_id: id });
        if (error) throw error;
        toast.success('Reservation rejected.');
      } else if (action === 'entry') {
        await reservationService.markEntry(id);
        toast.success('Vehicle entry marked.');
        const r = reservations.find(x => x.id === id);
        log({ action:'reservation.entry', entityType:'reservation', entityId:id, meta:{ vehicle_number:r?.vehicle_number, parking_name:r?.parking?.name } });
      } else {
        await reservationService.markExit(id);
        toast.success('Vehicle exit marked. Slot freed!');
        const r = reservations.find(x => x.id === id);
        log({ action:'reservation.exit', entityType:'reservation', entityId:id, meta:{ vehicle_number:r?.vehicle_number, parking_name:r?.parking?.name } });
      }
      load(page);
    } catch (err) { toast.error(err.message || 'Action failed.'); }
    finally { setActioning(null); }
  };

  return (
    <OwnerLayout
      title="Reservations"
      subtitle={`${total} total across your parking locations`}
      action={
        !loading && (
          <div className="flex items-center gap-2">
            {[
              { label:`${statsBar.confirmed} Confirmed`, color:'bg-blue-400/20 text-blue-100 border-blue-400/30' },
              { label:`${statsBar.active} Active`,       color:'bg-green-400/20 text-green-100 border-green-400/30' },
            ].map(s => (
              <span key={s.label} className={`hidden sm:inline text-xs font-semibold px-3 py-1.5 rounded-full border ${s.color}`}>{s.label}</span>
            ))}
            <button onClick={handleExport} disabled={exporting}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border bg-white/10 text-white/80 border-white/20 hover:bg-white/20 transition-all disabled:opacity-40">
              {exporting
                ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              }
              Export CSV
            </button>
          </div>
        )
      }>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Summary stats */}
          {summary && (
            <div className="hidden sm:grid grid-cols-5 gap-3 mb-6">
              {[
                { label:'Total Bookings', value: summary.total,                   color:'text-indigo-600', bg:'bg-indigo-50 border-indigo-100' },
                { label:'Total Revenue',  value: formatCurrency(summary.revenue),  color:'text-green-700', bg:'bg-green-50 border-green-100'   },
                { label:'Completed',      value: summary.completed,               color:'text-purple-700',bg:'bg-purple-50 border-purple-100'  },
                { label:'Completion Rate',value: `${summary.rate}%`,              color:'text-amber-700', bg:'bg-amber-50 border-amber-100'    },
                { label:'Pending',        value: summary.pending,                 color:'text-orange-700',bg:'bg-orange-50 border-orange-100'  },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl border p-4 text-center ${s.bg}`}>
                  <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-xs font-semibold text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filter tabs — segmented */}
          <div className="flex border-b border-gray-200 mb-4">
            {STATUSES.map(s => (
              <button key={s} onClick={() => handleFilter(s)}
                className={`flex-1 py-2.5 text-xs font-semibold whitespace-nowrap transition-all text-center border-b-2 -mb-px ${
                  filter===s
                    ? 'text-indigo-600 border-indigo-600'
                    : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                {s ? s.charAt(0).toUpperCase()+s.slice(1) : 'All'}
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="mb-3 space-y-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" placeholder="Search plate number or booking ID…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"/>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="flex-1 min-w-0 py-2.5 px-3 text-sm rounded-xl border border-gray-200 outline-none focus:border-indigo-400 transition-all text-gray-600"/>
              <span className="text-gray-400 text-sm flex-shrink-0">→</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="flex-1 min-w-0 py-2.5 px-3 text-sm rounded-xl border border-gray-200 outline-none focus:border-indigo-400 transition-all text-gray-600"/>
              <button type="submit" className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>Search</button>
              {(search || fromDate || toDate) && (
                <button type="button" onClick={clearSearch}
                  className="flex-shrink-0 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 border border-gray-200 bg-white transition-all">✕</button>
              )}
            </div>
          </form>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-20"><LoadingSpinner size="lg"/></div>
          ) : reservations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 gap-3">
              {search && <p className="text-xs text-gray-400">No results for <strong className="text-gray-600">"{search}"</strong></p>}
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
                </svg>
              </div>
              <p className="text-gray-500 text-sm">No reservations found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-gray-50">
                {reservations.map(r => (
                  <div key={`m-${r.id}`} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg flex-shrink-0">
                          #{String(r.id).padStart(4,'0')}
                        </span>
                        <StatusBadge status={r.status}/>
                      </div>
                      <p className="text-sm font-bold text-gray-900 flex-shrink-0">{formatCurrency(r.total_amount)}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                        {(r.driver?.name||'U').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{r.driver?.name||'—'}</p>
                        <p className="text-xs text-gray-400 truncate">{r.parking?.name||'—'}</p>
                      </div>
                      <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg flex-shrink-0">{r.vehicle_number}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 rounded-xl px-3 py-2">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Check-in</p>
                        <p className="text-xs font-semibold text-gray-700">{formatDateTime(r.start_time)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl px-3 py-2">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Check-out</p>
                        <p className="text-xs font-semibold text-gray-700">{formatDateTime(r.end_time)}</p>
                      </div>
                    </div>
                    {['pending','confirmed','active'].includes(r.status) && (
                      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        {r.status==='pending' && <>
                          <button onClick={()=>handleAction(r.id,'approve')} disabled={actioning===r.id}
                            className="flex-1 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-40"
                            style={{ background:'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                            {actioning===r.id?'…':'✓ Approve'}
                          </button>
                          <button onClick={()=>handleAction(r.id,'reject')} disabled={actioning===r.id}
                            className="flex-1 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-40"
                            style={{ background:'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                            {actioning===r.id?'…':'✕ Reject'}
                          </button>
                        </>}
                        {r.status==='confirmed' && (
                          <button onClick={()=>handleAction(r.id,'entry')} disabled={actioning===r.id}
                            className="flex-1 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-40"
                            style={{ background:'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
                            {actioning===r.id?'…':'→ Mark Entry'}
                          </button>
                        )}
                        {r.status==='active' && (
                          <button onClick={()=>handleAction(r.id,'exit')} disabled={actioning===r.id}
                            className="flex-1 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-40"
                            style={{ background:'linear-gradient(135deg,#059669,#10b981)' }}>
                            {actioning===r.id?'…':'↦ Mark Exit'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full" style={{ minWidth:'860px' }}>
                  <thead>
                    <tr className="border-b border-gray-100" style={{ background:'#f8fafc' }}>
                      {['Booking','Driver','Location','Vehicle','Time','Amount','Status','Actions'].map(h => (
                        <th key={h} className="px-4 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {reservations.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                            #{String(r.id).padStart(4,'0')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
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
                          <p className="text-sm text-gray-700 font-medium truncate max-w-[140px]">{r.parking?.name||'—'}</p>
                        </td>
                        {/* Vehicle + Type merged */}
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg">{r.vehicle_number}</span>
                          <p className="text-[11px] text-gray-400 capitalize mt-0.5">{r.vehicle_type || ''}</p>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="text-xs text-gray-600">{formatDateTime(r.start_time)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">→ {formatDateTime(r.end_time)}</p>
                          {r.entry_time && <p className="text-[10px] text-green-600 mt-0.5">In: {formatDateTime(r.entry_time)}</p>}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(r.total_amount)}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={r.status}/>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex gap-1 items-center flex-nowrap">
                            {r.status === 'pending' && (
                              <>
                                <button onClick={() => handleAction(r.id,'approve')} disabled={actioning===r.id}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-white rounded-lg transition-all disabled:opacity-40 whitespace-nowrap hover:brightness-110 hover:scale-105 active:scale-95"
                                  style={{ background:'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                                  {actioning===r.id ? '…' : <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>Approve</>}
                                </button>
                                <button onClick={() => handleAction(r.id,'reject')} disabled={actioning===r.id}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-white rounded-lg transition-all disabled:opacity-40 whitespace-nowrap hover:brightness-110 hover:scale-105 active:scale-95"
                                  style={{ background:'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                                  {actioning===r.id ? '…' : <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>Reject</>}
                                </button>
                              </>
                            )}
                            {r.status === 'confirmed' && (
                              <button onClick={() => handleAction(r.id,'entry')} disabled={actioning===r.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-white rounded-lg transition-all disabled:opacity-40 whitespace-nowrap hover:brightness-110 hover:scale-105 active:scale-95"
                                style={{ background:'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
                                {actioning===r.id ? '…' : <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 16l-4-4m0 0l4-4m-4 4h14"/></svg>Entry</>}
                              </button>
                            )}
                            {r.status === 'active' && (
                              <button onClick={() => handleAction(r.id,'exit')} disabled={actioning===r.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-white rounded-lg transition-all disabled:opacity-40 whitespace-nowrap hover:brightness-110 hover:scale-105 active:scale-95"
                                style={{ background:'linear-gradient(135deg,#059669,#10b981)' }}>
                                {actioning===r.id ? '…' : <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>Exit</>}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {total > LIMIT && (
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100" style={{ background:'#f8fafc' }}>
                  <p className="text-xs text-gray-400">Showing {(page-1)*LIMIT+1}–{Math.min(page*LIMIT,total)} of {total}</p>
                  <div className="flex gap-2">
                    <button onClick={() => load(page-1)} disabled={page===1}
                      className="px-3 py-1.5 rounded-lg text-sm text-gray-500 border border-gray-200 hover:bg-white disabled:opacity-30 transition-all">←</button>
                    <span className="px-3 py-1.5 text-sm text-gray-600 font-medium">{page} / {Math.ceil(total/LIMIT)}</span>
                    <button onClick={() => load(page+1)} disabled={page>=Math.ceil(total/LIMIT)}
                      className="px-3 py-1.5 rounded-lg text-sm text-gray-500 border border-gray-200 hover:bg-white disabled:opacity-30 transition-all">→</button>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
    </OwnerLayout>
  );
}
