import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { supabase } from '../../lib/supabase';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { downloadCSV } from '../../utils/csvExport';
import toast from 'react-hot-toast';

const FILTERS = [
  { key: 'all',      label: 'All Owners'  },
  { key: 'active',   label: 'Active'      },
  { key: 'inactive', label: 'Inactive'    },
];

export default function AdminParkOwners() {
  const [owners,    setOwners]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('all');
  const [search,    setSearch]    = useState('');
  const [toggling,  setToggling]  = useState(null);
  const [confirm,   setConfirm]   = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('users')
        .select(`
          id, name, email, phone, is_active, created_at,
          parking_locations!parking_locations_owner_id_fkey(id, name, status, available_slots, total_slots, hourly_rate)
        `)
        .eq('role', 'owner')
        .order('created_at', { ascending: false });
      setOwners(data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const doToggle = async (id, isActive) => {
    setToggling(id);
    try {
      await supabase.from('users').update({ is_active: !isActive }).eq('id', id);
      toast.success(`Owner ${isActive ? 'deactivated' : 'activated'}.`);
      load();
    } catch (err) { toast.error(err.message || 'Failed.'); }
    finally { setToggling(null); }
  };

  const confirmToggle = (o) => setConfirm({
    title:        o.is_active ? 'Deactivate Owner?' : 'Activate Owner?',
    message:      o.is_active
      ? `${o.name} and all their parking listings will be deactivated.`
      : `${o.name}'s account will be restored and they can manage their listings.`,
    confirmLabel: o.is_active ? 'Deactivate' : 'Activate',
    danger:       o.is_active,
    onConfirm:    () => doToggle(o.id, o.is_active),
  });

  const exportCSV = () => {
    downloadCSV(filtered, [
      { label:'Name',     value: o => o.name },
      { label:'Email',    value: o => o.email },
      { label:'Phone',    value: o => o.phone || '' },
      { label:'Status',   value: o => o.is_active ? 'Active' : 'Inactive' },
      { label:'Locations',value: o => (o.parking_locations||[]).length },
      { label:'Joined',   value: o => new Date(o.created_at).toLocaleDateString() },
    ], `park-owners-${new Date().toISOString().slice(0,10)}.csv`);
  };

  const filtered = owners
    .filter(o => filter === 'all' || (filter === 'active' ? o.is_active : !o.is_active))
    .filter(o => !search.trim() ||
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase()));

  const active   = owners.filter(o => o.is_active);
  const inactive = owners.filter(o => !o.is_active);
  const totalLocations = owners.reduce((s, o) => s + (o.parking_locations || []).length, 0);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">

        <AdminPageHeader
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>}
          label="Admin" title="Park Owners"
          subtitle="Manage all parking owner accounts"
          color="#f97316"
          stats={[
            { value: owners.length,    label: 'Total Owners'   },
            { value: active.length,    label: 'Active'         },
            { value: inactive.length,  label: 'Pending Approval' },
            { value: totalLocations,   label: 'Total Locations' },
          ]}
          right={
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
              style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export CSV
            </button>
          }
        />

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Filter tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-full">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filter === f.key ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                style={filter === f.key ? { background:'linear-gradient(135deg,#f97316,#ea580c)' } : {}}>
                {f.label}
                {f.key === 'inactive' && inactive.length > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 rounded-full">{inactive.length}</span>
                )}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="text" placeholder="Search owners by name or email…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-50 transition-all"/>
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {Array(6).fill(0).map((_,i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
                <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse flex-shrink-0"/>
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-100 rounded animate-pulse w-1/3"/>
                  <div className="h-3 bg-gray-50 rounded animate-pulse w-1/2"/>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5"/>
              </svg>
            </div>
            <p className="text-base font-bold text-gray-700">{search ? `No results for "${search}"` : 'No owners found'}</p>
            <p className="text-sm text-gray-400">{search ? 'Try a different search' : 'Owners will appear here after registering'}</p>
          </div>
        ) : (
          <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(o => {
              const locs = o.parking_locations || [];
              const approved = locs.filter(l => l.status === 'approved').length;
              return (
                <div key={`mc-${o.id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold"
                        style={{ background: o.is_active ? 'linear-gradient(135deg,#f97316,#ea580c)' : '#cbd5e1' }}>
                        {o.name.charAt(0)}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${o.is_active ? 'bg-green-500' : 'bg-gray-300'}`}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{o.name}</p>
                      <p className="text-xs text-gray-400 truncate">{o.email}</p>
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${o.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${o.is_active ? 'bg-green-500' : 'bg-red-400'}`}/>
                      {o.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {locs.length > 0 && (
                    <div className="flex items-center gap-2 bg-orange-50 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-orange-700">{locs.length}</span>
                        <span className="text-xs text-orange-500">location{locs.length!==1?'s':''}</span>
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">{approved} approved</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-300">{formatDate(o.created_at)}</p>
                    <button onClick={() => confirmToggle(o)} disabled={toggling === o.id}
                      className="text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-40"
                      style={o.is_active
                        ? { background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444' }
                        : { background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff' }}>
                      {toggling === o.id ? '…' : o.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[10px] font-bold uppercase tracking-widest"
              style={{ color:'#f97316', background:'#fff7ed', borderBottom:'2px solid #fed7aa' }}>
              <div className="col-span-4">Owner</div>
              <div className="col-span-4">Locations</div>
              <div className="col-span-2">Joined</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            <div className="divide-y divide-gray-50">
              {filtered.map(o => {
                const locs = o.parking_locations || [];
                const approved = locs.filter(l => l.status === 'approved').length;
                return (
                  <div key={o.id} className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-orange-50/30 transition-colors">
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-extrabold"
                          style={{ background: o.is_active ? 'linear-gradient(135deg,#f97316,#ea580c)' : '#cbd5e1' }}>
                          {o.name.charAt(0)}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${o.is_active ? 'bg-green-500' : 'bg-gray-300'}`}/>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{o.name}</p>
                        <p className="text-xs text-gray-400 truncate">{o.email}</p>
                      </div>
                    </div>
                    <div className="col-span-4 min-w-0">
                      {locs.length === 0 ? (
                        <span className="text-xs text-gray-300 italic">No locations</span>
                      ) : (
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-sm font-bold text-gray-800">{locs.length}</span>
                            <span className="text-xs text-gray-400">location{locs.length !== 1 ? 's' : ''}</span>
                            <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">{approved} approved</span>
                          </div>
                          <p className="text-xs text-gray-400 truncate max-w-[180px]">{locs[0]?.name}{locs.length > 1 ? ` +${locs.length-1} more` : ''}</p>
                        </div>
                      )}
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">{formatDate(o.created_at)}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold mt-0.5 ${o.is_active ? 'text-green-700' : 'text-red-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${o.is_active ? 'bg-green-500' : 'bg-red-400'}`}/>
                        {o.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center justify-end">
                      <button onClick={() => confirmToggle(o)} disabled={toggling === o.id}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 hover:scale-105 active:scale-95 whitespace-nowrap"
                        style={o.is_active
                          ? { background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', backdropFilter:'blur(8px)' }
                          : { background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', boxShadow:'0 2px 8px rgba(34,197,94,0.4)' }}>
                        {toggling === o.id ? '…' : o.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <p className="text-xs text-gray-400">{filtered.length} owner{filtered.length !== 1 ? 's' : ''}</p>
              {inactive.length > 0 && (
                <p className="text-xs text-amber-600 font-medium">{inactive.length} inactive account{inactive.length !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          </>
        )}
      </div>
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)}/>
    </AdminLayout>
  );
}
