import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function AdminManagers() {
  const [managers,    setManagers]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [toggling,    setToggling]    = useState(null);
  const [unassigning, setUnassigning] = useState(null);
  const [confirm,     setConfirm]     = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('users')
        .select(`
          id, name, email, phone, is_active, created_at,
          parking:parking_locations!parking_locations_manager_id_fkey(id, name, address, status, owner_id,
            owner:users!parking_locations_owner_id_fkey(name, email))
        `)
        .eq('role', 'manager')
        .order('created_at', { ascending: false });
      setManagers(data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = managers.filter(m =>
    !search.trim() ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const doToggle = async (id, isActive) => {
    setToggling(id);
    try {
      await supabase.from('users').update({ is_active: !isActive }).eq('id', id);
      toast.success(`Manager ${isActive ? 'deactivated' : 'activated'}.`);
      load();
    } catch (err) { toast.error(err.message || 'Failed.'); }
    finally { setToggling(null); }
  };

  const doUnassign = async (managerId, parkingId) => {
    setUnassigning(managerId);
    try {
      await supabase.from('parking_locations').update({ manager_id: null }).eq('id', parkingId);
      toast.success('Manager unassigned.');
      load();
    } catch (err) { toast.error(err.message || 'Failed.'); }
    finally { setUnassigning(null); }
  };

  const confirmToggle = (m) => setConfirm({
    title:        m.is_active ? 'Deactivate Manager?' : 'Activate Manager?',
    message:      m.is_active
      ? `${m.name} will lose access to their account immediately.`
      : `${m.name}'s account will be restored and they can log in again.`,
    confirmLabel: m.is_active ? 'Deactivate' : 'Activate',
    danger:       m.is_active,
    onConfirm:    () => doToggle(m.id, m.is_active),
  });

  const confirmUnassign = (m, parking) => setConfirm({
    title:        'Unassign Manager?',
    message:      `${m.name} will lose access to "${parking.name}" immediately.`,
    confirmLabel: 'Unassign',
    danger:       true,
    onConfirm:    () => doUnassign(m.id, parking.id),
  });

  const assigned   = managers.filter(m => m.parking);
  const unassigned = managers.filter(m => !m.parking);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">

        <AdminPageHeader
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
          label="Management" title="Parking Managers"
          subtitle="Manager accounts across all parking locations"
          color="#8b5cf6"
          stats={[
            { value: managers.length,  label: 'Total'      },
            { value: assigned.length,  label: 'Assigned'   },
            { value: unassigned.length, label: 'Unassigned' },
            { value: managers.filter(m => !m.is_active).length, label: 'Inactive' },
          ]}
        />

        {/* Search */}
        <div className="relative mb-6">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input type="text" placeholder="Search managers by name or email…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 bg-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-50 transition-all"/>
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-52 rounded-2xl bg-white border border-gray-100 animate-pulse"/>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <p className="text-base font-bold text-gray-700">{search ? `No results for "${search}"` : 'No managers yet'}</p>
            <p className="text-sm text-gray-400">{search ? 'Try a different search term' : 'Manager accounts will appear here once created'}</p>
          </div>
        ) : (
          <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(m => {
              const parking = Array.isArray(m.parking) ? m.parking[0] : m.parking;
              return (
                <div key={`mc-${m.id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                  {/* Manager info */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold"
                        style={{ background: m.is_active ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : '#cbd5e1' }}>
                        {m.name.charAt(0)}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${m.is_active ? 'bg-green-500' : 'bg-gray-300'}`}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{m.name}</p>
                      <p className="text-xs text-gray-400 truncate">{m.email}</p>
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${
                      m.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-green-500' : 'bg-red-400'}`}/>
                      {m.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {/* Assignment */}
                  {parking ? (
                    <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                      <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clipRule="evenodd"/></svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{parking.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{parking.owner?.name}</p>
                      </div>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"/>
                      Unassigned
                    </span>
                  )}
                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => confirmToggle(m)} disabled={toggling === m.id}
                      className="flex-1 py-2 rounded-xl text-xs font-bold disabled:opacity-40 transition-all"
                      style={m.is_active
                        ? { background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', backdropFilter:'blur(8px)' }
                        : { background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', boxShadow:'0 2px 8px rgba(34,197,94,0.4)' }}>
                      {toggling === m.id ? '…' : m.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    {parking && (
                      <button onClick={() => confirmUnassign(m, parking)} disabled={unassigning === m.id}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-all">
                        {unassigning === m.id ? '…' : 'Unassign'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[10px] font-bold uppercase tracking-widest"
              style={{ color:'#6366f1', background:'#f5f7ff', borderBottom:'2px solid #e0e7ff' }}>
              <div className="col-span-4">Manager</div>
              <div className="col-span-4">Assigned Location</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-50">
              {filtered.map(m => {
                const parking = Array.isArray(m.parking) ? m.parking[0] : m.parking;
                return (
                  <div key={m.id} className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-slate-50/60 transition-colors">
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-extrabold"
                          style={{ background: m.is_active ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : '#cbd5e1' }}>
                          {m.name.charAt(0)}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${m.is_active ? 'bg-green-500' : 'bg-gray-300'}`}/>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                        <p className="text-xs text-gray-400 truncate">{m.email}</p>
                      </div>
                    </div>
                    <div className="col-span-4 min-w-0">
                      {parking ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clipRule="evenodd"/></svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{parking.name}</p>
                            <p className="text-xs text-gray-400 truncate">{parking.owner?.name}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"/>Unassigned
                        </span>
                      )}
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        m.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-green-500' : 'bg-red-400'}`}/>
                        {m.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      <button onClick={() => confirmToggle(m)} disabled={toggling === m.id}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-40 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                        style={m.is_active
                          ? { background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', backdropFilter:'blur(8px)' }
                          : { background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', boxShadow:'0 2px 8px rgba(34,197,94,0.4)' }}>
                        {toggling === m.id ? '…' : m.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      {parking && (
                        <button onClick={() => confirmUnassign(m, parking)} disabled={unassigning === m.id}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-all whitespace-nowrap">
                          {unassigning === m.id ? '…' : 'Unassign'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">{filtered.length} manager{filtered.length !== 1 ? 's' : ''} {search ? `matching "${search}"` : 'total'}</p>
            </div>
          </div>
          </>
        )}
      </div>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)}/>
    </AdminLayout>
  );
}
