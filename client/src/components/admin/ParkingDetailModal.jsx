import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatDate, formatDateTime, formatCurrency, statusColor } from '../../utils/helpers';
import { log } from '../../services/activityService';
import toast from 'react-hot-toast';

export default function ParkingDetailModal({ parking, onClose, onChanged }) {
  const [res,     setRes]     = useState([]);
  const [stats,   setStats]   = useState({ total:0, revenue:0, active:0 });
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(null);

  useEffect(() => {
    if (!parking) return;
    setLoading(true);
    supabase.from('reservations')
      .select('status, total_amount, created_at, vehicle_number, start_time, driver:users!reservations_user_id_fkey(name)')
      .eq('parking_id', parking.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setRes(data || []);
        const completed = (data||[]).filter(r => ['active','completed'].includes(r.status));
        setStats({
          total:   (data||[]).length,
          revenue: completed.reduce((s,r) => s + parseFloat(r.total_amount||0), 0),
          active:  (data||[]).filter(r => r.status==='active').length,
        });
      })
      .finally(() => setLoading(false));
  }, [parking]);

  const action = async (status) => {
    setActing(status);
    try {
      await supabase.from('parking_locations').update({ status }).eq('id', parking.id);
      toast.success(`Parking ${status}!`);
      log({ action:`parking.${status}`, entityType:'parking', entityId:parking.id, meta:{ parking_name:parking.name } });
      onChanged();
      onClose();
    } catch (err) { toast.error(err.message||'Failed.'); }
    finally { setActing(null); }
  };

  if (!parking) return null;

  const amenities = Array.isArray(parking.amenities) ? parking.amenities : JSON.parse(parking.amenities||'[]');
  const pct = parking.total_slots > 0 ? (parking.available_slots / parking.total_slots) * 100 : 0;
  const barColor = pct===0?'bg-red-500':pct<30?'bg-orange-500':pct<60?'bg-yellow-500':'bg-green-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col z-10 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0"
          style={{ background:'linear-gradient(to right,#eef2ff,#f5f3ff)' }}>
          <div>
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-0.5">Parking Location</p>
            <h2 className="text-lg font-extrabold text-gray-900">{parking.name}</h2>
            <p className="text-xs text-gray-400">{parking.address}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-white hover:text-gray-700 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">

            {/* Status + availability */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label:'Status',     value: parking.status,                  cls:'capitalize' },
                { label:'Rate',       value: `${formatCurrency(parking.hourly_rate)}/hr` },
                { label:'Owner',      value: parking.owner?.name || '--' },
                { label:'Submitted',  value: formatDate(parking.created_at) },
              ].map(d => (
                <div key={d.label} className="bg-gray-50 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{d.label}</p>
                  <p className={`text-sm font-bold text-gray-800 ${d.cls||''}`}>{d.value}</p>
                </div>
              ))}
            </div>

            {/* Slot availability */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-gray-700">Slot Availability</span>
                <span className="font-bold text-gray-900">{parking.available_slots} / {parking.total_slots} free</span>
              </div>
              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width:`${pct}%` }}/>
              </div>
            </div>

            {/* Revenue stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label:'Total Bookings',  value: stats.total },
                { label:'Active Now',      value: stats.active },
                { label:'Total Revenue',   value: formatCurrency(stats.revenue) },
              ].map(s => (
                <div key={s.label} className="text-center bg-indigo-50 rounded-xl py-3">
                  <p className="text-xl font-extrabold text-indigo-700">{s.value}</p>
                  <p className="text-xs text-indigo-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Amenities</p>
                <div className="flex flex-wrap gap-1.5">
                  {amenities.map(a => (
                    <span key={a} className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Recent reservations */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Recent Reservations</p>
              {loading ? (
                <div className="space-y-2">{Array(4).fill(0).map((_,i)=><div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse"/>)}</div>
              ) : res.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No reservations yet.</p>
              ) : (
                <div className="space-y-2">
                  {res.map(r => (
                    <div key={`${r.vehicle_number}-${r.created_at}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <span className="text-xs font-mono bg-gray-200 text-gray-600 px-2 py-0.5 rounded-lg flex-shrink-0">{r.vehicle_number}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{r.driver?.name} · {formatDateTime(r.start_time)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-semibold text-gray-700">{formatCurrency(r.total_amount)}</span>
                        <span className={`badge text-[10px] ${statusColor(r.status)}`}>{r.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          {parking.status !== 'approved' && (
            <button onClick={() => action('approved')} disabled={!!acting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background:'linear-gradient(135deg,#22c55e,#16a34a)' }}>
              {acting==='approved' ? '...' : 'Approve'}
            </button>
          )}
          {parking.status !== 'rejected' && (
            <button onClick={() => action('rejected')} disabled={!!acting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 disabled:opacity-40">
              {acting==='rejected' ? '...' : 'Reject'}
            </button>
          )}
          {parking.status === 'approved' && (
            <button onClick={() => action('inactive')} disabled={!!acting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200 disabled:opacity-40">
              Deactivate
            </button>
          )}
          <button onClick={onClose} className="btn-secondary px-5">Close</button>
        </div>
      </div>
    </div>
  );
}
