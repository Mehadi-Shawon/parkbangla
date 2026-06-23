import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DriverLayout from '../../components/driver/DriverLayout';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import * as reservationService from '../../services/reservationService';
import { downloadReceipt } from '../../utils/receiptDownload';
import { log } from '../../services/activityService';
import { formatDateTime, formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUSES = [
  { key:'',          label:'All' },
  { key:'confirmed', label:'Confirmed' },
  { key:'active',    label:'Active' },
  { key:'completed', label:'Completed' },
  { key:'cancelled', label:'Cancelled' },
];

const STATUS_CONFIG = {
  pending:   { bar:'#f59e0b', bg:'bg-amber-50',  text:'text-amber-700',  border:'border-amber-200'  },
  confirmed: { bar:'#3b82f6', bg:'bg-blue-50',   text:'text-blue-700',   border:'border-blue-200'   },
  active:    { bar:'#22c55e', bg:'bg-green-50',  text:'text-green-700',  border:'border-green-200'  },
  completed: { bar:'#9ca3af', bg:'bg-gray-100',  text:'text-gray-600',   border:'border-gray-200'   },
  cancelled: { bar:'#ef4444', bg:'bg-red-50',    text:'text-red-600',    border:'border-red-200'    },
};

const LIMIT = 10;

export default function ReservationHistory() {
  const [reservations, setReservations] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('');
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const [confirm,  setConfirm]  = useState(null);
  const navigate = useNavigate();

  const load = async (p=1, status=filter) => {
    setLoading(true);
    try {
      const { data, total: t } = await reservationService.getMyReservations({ status, page:p, limit:LIMIT });
      setReservations(data); setTotal(t); setPage(p);
    } catch { toast.error('Failed to load reservations.'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleFilter = (s) => { setFilter(s); load(1, s); };

  const handleCancel = (r) => {
    setConfirm({
      title:        'Cancel Reservation?',
      message:      `Cancel your booking at ${r.parking?.name}? This will free the slot and cannot be undone.`,
      confirmLabel: 'Cancel Reservation',
      danger:       true,
      onConfirm:    async () => {
        try {
          await reservationService.cancel(r.id);
          toast.success('Reservation cancelled.');
          log({ action:'reservation.cancelled', entityType:'reservation', entityId:r.id, meta:{ vehicle_number:r.vehicle_number } });
          load(page);
        } catch (err) { toast.error(err.message||'Failed to cancel.'); }
      },
    });
  };

  return (
    <DriverLayout title="My Bookings" subtitle={`${total} total booking${total!==1?'s':''}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Filter tabs */}
          <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
            {STATUSES.map(s => (
              <button key={s.key} onClick={() => handleFilter(s.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all flex-shrink-0
                  ${filter===s.key
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-200 hover:text-indigo-600'}`}>
                {s.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array(4).fill(0).map((_,i) => (
                <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse"/>
              ))}
            </div>
          ) : reservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-gray-800">No reservations found</p>
                <p className="text-sm text-gray-400 mt-1">
                  {filter ? `No ${filter} reservations` : 'Book your first parking spot!'}
                </p>
              </div>
              {!filter && <Link to="/search" className="btn-primary">Find Parking</Link>}
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.map(r => {
                const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                return (
                  <div key={r.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer group"
                    onClick={() => navigate(`/reservation/${r.id}`)}>
                    <div className="flex">
                      {/* Status bar */}
                      <div className="w-1 flex-shrink-0 self-stretch" style={{ background: cfg.bar }}/>

                      <div className="flex-1 p-4">

                        {/* Row 1: ID + status + amount */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg flex-shrink-0">
                              #{String(r.id).padStart(4,'0')}
                            </span>
                            <span className={`capitalize text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                              {r.status}
                            </span>
                          </div>
                          <p className="text-base font-extrabold text-gray-900 flex-shrink-0">{formatCurrency(r.total_amount)}</p>
                        </div>

                        {/* Row 2: Parking name + address */}
                        <h3 className="text-sm font-bold text-gray-900 truncate mb-0.5">{r.parking?.name || '--'}</h3>
                        <p className="text-xs text-gray-400 truncate mb-3">{r.parking?.address || ''}</p>

                        {/* Row 3: 2-col grid — vehicle + type */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          {[
                            { label:'Vehicle', value: r.vehicle_number },
                            { label:'Type',    value: r.vehicle_type || '--' },
                          ].map(d => (
                            <div key={d.label} className="bg-gray-50 rounded-xl px-3 py-2 min-w-0">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{d.label}</p>
                              <p className="text-xs font-semibold text-gray-700 truncate capitalize">{d.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Row 4: 2-col grid — dates */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {[
                            { label:'Check-in',  value: formatDateTime(r.start_time) },
                            { label:'Check-out', value: formatDateTime(r.end_time) },
                          ].map(d => (
                            <div key={d.label} className="bg-gray-50 rounded-xl px-3 py-2 min-w-0">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{d.label}</p>
                              <p className="text-xs font-semibold text-gray-700 truncate">{d.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Row 5: actions + view link */}
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-50">
                          <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                            {r.status === 'completed' && (
                              <button onClick={() => downloadReceipt(r, r.parking)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-all">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                Receipt
                              </button>
                            )}
                            {['pending','confirmed'].includes(r.status) && (
                              <button onClick={() => handleCancel(r)}
                                className="text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-all">
                                Cancel
                              </button>
                            )}
                          </div>
                          <Link to={`/reservation/${r.id}`}
                            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex-shrink-0">
                            View Status
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                          </Link>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {total > LIMIT && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button onClick={()=>load(page-1)} disabled={page===1}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 border border-gray-200 bg-white hover:border-indigo-200 disabled:opacity-30">
                Previous
              </button>
              <span className="text-sm text-gray-400">Page {page} of {Math.ceil(total/LIMIT)}</span>
              <button onClick={()=>load(page+1)} disabled={page>=Math.ceil(total/LIMIT)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 border border-gray-200 bg-white hover:border-indigo-200 disabled:opacity-30">
                Next
              </button>
            </div>
          )}
      </div>
      <ConfirmDialog config={confirm} onClose={()=>setConfirm(null)}/>
    </DriverLayout>
  );
}
