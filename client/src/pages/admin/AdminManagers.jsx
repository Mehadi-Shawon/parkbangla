import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function AdminManagers() {
  const [managers,  setManagers]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [toggling,  setToggling]  = useState(null);
  const [unassigning, setUnassigning] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      // Fetch all managers with their assigned parking location
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

  const toggleStatus = async (id, isActive) => {
    setToggling(id);
    try {
      await supabase.from('users').update({ is_active: !isActive }).eq('id', id);
      toast.success(`Manager ${isActive ? 'deactivated' : 'activated'}.`);
      load();
    } catch (err) { toast.error(err.message || 'Failed.'); }
    finally { setToggling(null); }
  };

  const unassign = async (managerId, parkingId, managerName) => {
    if (!window.confirm(`Unassign ${managerName} from this parking location?`)) return;
    setUnassigning(managerId);
    try {
      await supabase.from('parking_locations').update({ manager_id: null }).eq('id', parkingId);
      toast.success('Manager unassigned.');
      load();
    } catch (err) { toast.error(err.message || 'Failed.'); }
    finally { setUnassigning(null); }
  };

  // Stats
  const assigned   = managers.filter(m => m.parking);
  const unassigned = managers.filter(m => !m.parking);
  const inactive   = managers.filter(m => !m.is_active);

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">

        {/* Header */}
        <AdminPageHeader
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
          label="Management" title="Parking Managers"
          subtitle="Manager accounts across all parking locations"
          color="#8b5cf6"
          stats={[
            { value: managers.length, label: 'Total'      },
            { value: assigned.length, label: 'Assigned'   },
            { value: managers.filter(m => !m.parking).length, label: 'Unassigned' },
          ]}
        />

        {/* Stats row */}
        {!loading && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
            {[
              { label: 'Total Managers',    value: managers.length,   color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
              { label: 'Assigned to Lot',   value: assigned.length,   color: 'bg-green-50 text-green-700 border-green-100'    },
              { label: 'No Assignment',     value: unassigned.length, color: unassigned.length > 0 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-gray-50 text-gray-500 border-gray-100' },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl border p-3 sm:p-4 text-center ${s.color}`}>
                <p className="text-xl sm:text-2xl font-extrabold">{s.value}</p>
                <p className="text-[10px] sm:text-xs font-semibold mt-0.5 opacity-75 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text" placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* Manager cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-white border border-gray-100 animate-pulse"/>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <p className="text-sm text-gray-400">{search ? `No managers matching "${search}"` : 'No managers yet.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(m => {
              const parking = Array.isArray(m.parking) ? m.parking[0] : m.parking;
              return (
                <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                  <div className="p-5">
                    {/* Manager info */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: m.is_active ? 'linear-gradient(135deg,#6366f1,#2563eb)' : '#cbd5e1' }}>
                        {m.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-gray-900 truncate">{m.name}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            m.is_active
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-red-50 text-red-600 border-red-200'
                          }`}>
                            {m.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{m.email}</p>
                        {m.phone && <p className="text-xs text-gray-300">{m.phone}</p>}
                      </div>
                    </div>

                    {/* Assigned parking */}
                    {parking ? (
                      <div className="rounded-xl bg-green-50 border border-green-100 p-3 mb-4">
                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1.5">Assigned Location</p>
                        <p className="text-sm font-semibold text-gray-800 truncate">{parking.name}</p>
                        <p className="text-xs text-gray-400 truncate">{parking.address}</p>
                        {parking.owner && (
                          <p className="text-xs text-gray-400 mt-1">
                            Owner: <span className="font-medium text-gray-600">{parking.owner.name}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl bg-amber-50 border border-dashed border-amber-200 p-3 mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        <p className="text-xs text-amber-600 font-medium">No parking location assigned</p>
                      </div>
                    )}

                    {/* Meta */}
                    <p className="text-[10px] text-gray-300 mb-4">Member since {formatDate(m.created_at)}</p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleStatus(m.id, m.is_active)}
                        disabled={toggling === m.id}
                        className={`flex-1 text-xs font-semibold py-2 rounded-xl border transition-all disabled:opacity-40 ${
                          m.is_active
                            ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'
                        }`}>
                        {toggling === m.id ? '...' : m.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      {parking && (
                        <button
                          onClick={() => unassign(m.id, parking.id, m.name)}
                          disabled={unassigning === m.id}
                          className="flex-1 text-xs font-semibold py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40">
                          {unassigning === m.id ? '...' : 'Unassign'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}



