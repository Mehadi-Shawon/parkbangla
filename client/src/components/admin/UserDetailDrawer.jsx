import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatDate, formatDateTime, formatCurrency, getInitials, statusColor } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function UserDetailDrawer({ user, onClose, onStatusChanged }) {
  const [reservations, setReservations] = useState([]);
  const [vehicles,     setVehicles]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [toggling,     setToggling]     = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      supabase.from('reservations')
        .select('*, parking:parking_locations(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase.from('vehicles')
        .select('*')
        .eq('user_id', user.id),
    ]).then(([r, v]) => {
      setReservations(r.data || []);
      setVehicles(v.data || []);
    }).finally(() => setLoading(false));
  }, [user]);

  const toggleStatus = async () => {
    setToggling(true);
    try {
      await supabase.from('users').update({ is_active: !user.is_active }).eq('id', user.id);
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}.`);
      onStatusChanged();
    } catch (err) { toast.error(err.message || 'Failed.'); }
    finally { setToggling(false); }
  };

  if (!user) return null;

  const roleColor = { admin:'bg-violet-100 text-violet-700', owner:'bg-blue-100 text-blue-700', driver:'bg-gray-100 text-gray-600', manager:'bg-indigo-100 text-indigo-700' };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose}/>

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"
          style={{ background:'linear-gradient(to right,#eef2ff,#f5f3ff)' }}>
          <p className="text-sm font-bold text-indigo-700">User Details</p>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Profile section */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                {getInitials(user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900">{user.name}</h2>
                <p className="text-sm text-gray-400">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${roleColor[user.role]}`}>{user.role}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label:'Phone',   value: user.phone || '--' },
                { label:'Joined',  value: formatDate(user.created_at) },
                { label:'User ID', value: `#${user.id}` },
              ].map(d => (
                <div key={d.label} className="bg-gray-50 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{d.label}</p>
                  <p className="text-sm font-semibold text-gray-700">{d.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Vehicles */}
          {vehicles.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Vehicles ({vehicles.length})</p>
              <div className="space-y-2">
                {vehicles.map(v => (
                  <div key={v.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                    <span className="text-lg">{v.vehicle_type==='motorcycle'?'🏍':'🚗'}</span>
                    <div>
                      <p className="text-sm font-bold text-gray-800 font-mono">{v.vehicle_number}</p>
                      <p className="text-xs text-gray-400">{[v.make,v.model,v.color].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reservations */}
          <div className="px-6 py-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Recent Reservations</p>
            {loading ? (
              <div className="space-y-2">{Array(4).fill(0).map((_,i)=><div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse"/>)}</div>
            ) : reservations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No reservations yet.</p>
            ) : (
              <div className="space-y-2">
                {reservations.map(r => (
                  <div key={r.id} className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex justify-between items-start mb-0.5">
                      <p className="text-sm font-semibold text-gray-800 truncate">{r.parking?.name}</p>
                      <span className={`badge text-xs flex-shrink-0 ml-2 ${statusColor(r.status)}`}>{r.status}</span>
                    </div>
                    <p className="text-xs text-gray-400">{r.vehicle_number} · {formatDateTime(r.start_time)}</p>
                    <p className="text-xs font-semibold text-indigo-600 mt-0.5">{formatCurrency(r.total_amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer action */}
        {user.role !== 'admin' && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button onClick={toggleStatus} disabled={toggling}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 ${
                user.is_active
                  ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                  : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'
              }`}>
              {toggling ? '...' : user.is_active ? 'Deactivate Account' : 'Activate Account'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
