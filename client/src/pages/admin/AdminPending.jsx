import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { supabase } from '../../lib/supabase';
import { log } from '../../services/activityService';
import { formatDate, formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function AdminPending() {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('parking_locations')
        .select('*, owner:users!parking_locations_owner_id_fkey(name, email, phone)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true }); // oldest first
      setItems(data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const action = async (id, status, name) => {
    setActing(id);
    try {
      await supabase.from('parking_locations').update({ status }).eq('id', id);
      toast.success(`Parking ${status}!`);
      log({ action: `parking.${status}`, entityType: 'parking', entityId: id, meta: { parking_name: name } });
      load();
    } catch (err) { toast.error(err.message || 'Failed.'); }
    finally { setActing(null); }
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <AdminPageHeader
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>}
          label="Admin" title="Pending Inbox"
          subtitle={`${items.length} item${items.length!==1?'s':''} waiting for your approval`}
          color="#f59e0b"
        />

        {loading ? (
          <div className="space-y-4">{Array(3).fill(0).map((_,i)=><div key={i} className="h-36 admin-card rounded-2xl animate-pulse"/>)}</div>
        ) : items.length === 0 ? (
          <div className="admin-card rounded-2xl flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">All caught up!</p>
              <p className="text-sm text-gray-400 mt-1">No parking locations are waiting for approval.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((p, idx) => (
              <div key={p.id} className="admin-card rounded-2xl overflow-hidden">
                {/* Queue position bar */}
                <div className="h-1" style={{ background: idx === 0 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : '#e2e8f0' }}/>

                <div className="p-5">
                  <div className="flex items-start gap-4 flex-wrap">
                    {/* Queue number */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: idx === 0 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : '#e2e8f0', color: idx === 0 ? '#fff' : '#9ca3af' }}>
                      #{idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-base font-bold text-gray-900">{p.name}</h3>
                        {idx === 0 && <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Oldest — Review First</span>}
                      </div>
                      <p className="text-sm text-gray-500 mb-3">{p.address}</p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {[
                          { label:'Owner',    value: p.owner?.name || '--' },
                          { label:'Contact',  value: p.owner?.email || '--' },
                          { label:'Slots',    value: p.total_slots },
                          { label:'Rate',     value: `${formatCurrency(p.hourly_rate)}/hr` },
                        ].map(d => (
                          <div key={d.label} className="bg-gray-50 rounded-xl px-3 py-2">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{d.label}</p>
                            <p className="text-sm font-semibold text-gray-700 truncate">{d.value}</p>
                          </div>
                        ))}
                      </div>

                      {p.description && (
                        <p className="text-xs text-gray-500 mb-3 bg-gray-50 rounded-xl px-3 py-2 line-clamp-2">{p.description}</p>
                      )}

                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <p className="text-xs text-gray-400">Submitted {formatDate(p.created_at)}</p>
                        <div className="flex gap-2">
                          <button onClick={() => action(p.id,'rejected',p.name)} disabled={acting===p.id}
                            className="px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all disabled:opacity-40">
                            Reject
                          </button>
                          <button onClick={() => action(p.id,'approved',p.name)} disabled={acting===p.id}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                            style={{ background:'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow:'0 4px 12px rgba(34,197,94,0.25)' }}>
                            {acting===p.id ? 'Approving...' : 'Approve'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
