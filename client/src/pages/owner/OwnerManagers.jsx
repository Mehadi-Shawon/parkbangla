import { useState, useEffect } from 'react';
import OwnerLayout from '../../components/owner/OwnerLayout';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { log } from '../../services/activityService';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import * as managerService from '../../services/managerService';
import toast from 'react-hot-toast';

const inputCls = 'w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 bg-white text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50';
const labelCls = 'block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide';

/* ── Assign / Create Modal ──────────────────────────────── */
function ManagerModal({ parking, onClose, onDone }) {
  const [tab,     setTab]     = useState('create');
  const [form,    setForm]    = useState({ name:'', email:'', password:'' });
  const [showPw,  setShowPw]  = useState(false);
  const [search,  setSearch]  = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(null);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const createManager = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters.');
    setLoading(true);
    try {
      const { error } = await supabase.rpc('owner_create_manager', {
        p_name: form.name.trim(), p_email: form.email.toLowerCase().trim(),
        p_password: form.password, p_parking_id: parking.id,
      });
      if (error) throw new Error(error.message);
      log({ action:'manager.assigned', entityType:'parking', entityId: parking.id, meta:{ manager_name: form.name, parking_name: parking.name } });
      toast.success(`Manager account created for ${form.name}!`);
      onDone();
      setDone({ name: form.name, email: form.email, password: form.password });
    } catch (err) { toast.error(err.message || 'Failed to create manager.'); }
    finally { setLoading(false); }
  };

  const doSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const { data } = await supabase.from('users').select('id,name,email,role').ilike('email', `%${search}%`).limit(5);
      setResults(data || []);
      if (!data?.length) toast.error('No user found.');
    } finally { setLoading(false); }
  };

  const assign = async (u) => {
    setLoading(true);
    try {
      if (u.role !== 'manager') await supabase.from('users').update({ role: 'manager' }).eq('id', u.id);
      await managerService.assignManager(parking.id, u.id);
      toast.success(`${u.name} assigned!`);
      onDone(); onClose();
    } catch (err) { toast.error(err.message || 'Failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 overflow-hidden"
          style={{ background:'linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4338ca 100%)' }}>
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5"/>
          <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Assign Manager</h2>
              <p className="text-indigo-200/80 text-xs mt-0.5 truncate max-w-[240px]">{parking.name}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mx-5 mt-4 p-1 bg-gray-100 rounded-xl">
          {[{ key:'create', label:'Create New' },{ key:'assign', label:'Assign Existing' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab===t.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-5 py-5">
          {tab === 'create' && (done ? (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Account Created!</h3>
              <p className="text-sm text-gray-500 mb-5">Share these credentials with <strong className="text-gray-800">{done.name}</strong></p>
              <div className="space-y-3 mb-5">
                {[{ label:'Email', value: done.email },{ label:'Password', value: done.password }].map(f => (
                  <div key={f.label} className="text-left bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{f.label}</p>
                    <p className="text-sm font-mono font-bold text-gray-900 select-all break-all">{f.value}</p>
                  </div>
                ))}
                <p className="text-xs text-gray-400 text-left">Log in at <span className="font-semibold text-indigo-600">parkbangla.com/login</span></p>
              </div>
              <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>Done</button>
            </div>
          ) : (
            <form onSubmit={createManager} className="space-y-4">
              {[{ name:'name', label:'Full Name', type:'text', ph:'John Smith' },{ name:'email', label:'Email Address', type:'email', ph:'manager@example.com' }].map(f => (
                <div key={f.name}>
                  <label className={labelCls}>{f.label} *</label>
                  <input name={f.name} type={f.type} required className={inputCls} placeholder={f.ph} value={form[f.name]} onChange={handle}/>
                </div>
              ))}
              <div>
                <label className={labelCls}>Password *</label>
                <div className="relative">
                  <input name="password" type={showPw ? 'text':'password'} required className={`${inputCls} pr-10`} placeholder="Min. 6 characters" value={form.password} onChange={handle}/>
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw
                      ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    }
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)', boxShadow:'0 4px 14px rgba(99,102,241,0.35)' }}>
                {loading ? <span className="flex items-center justify-center gap-2"><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Creating…</span> : 'Create Manager Account'}
              </button>
            </form>
          ))}

          {tab === 'assign' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">Search an existing user by email to assign as manager.</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input className={`${inputCls} pl-9`} placeholder="Search by email…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter' && doSearch()}/>
                </div>
                <button onClick={doSearch} disabled={loading} className="px-4 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>{loading?'…':'Search'}</button>
              </div>
              {results.length > 0 && (
                <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50">
                  {results.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-3.5 hover:bg-gray-50 transition-colors">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>{u.name.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                      <button onClick={() => assign(u)} disabled={loading} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-40" style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>Assign</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────── */
export default function OwnerManagers() {
  const { user }   = useAuth();
  const [parkings, setParkings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');
  const [search,   setSearch]   = useState('');
  const [modal,    setModal]    = useState(null);
  const [confirm,  setConfirm]  = useState(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('parking_locations')
        .select('*, manager:users!parking_locations_manager_id_fkey(id,name,email,phone)')
        .eq('owner_id', user.id)
        .order('name', { ascending: true });
      setParkings(data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const assigned   = parkings.filter(p => p.manager_id);
  const unassigned = parkings.filter(p => !p.manager_id);
  const coverage   = parkings.length ? Math.round((assigned.length / parkings.length) * 100) : 0;

  const visible = parkings
    .filter(p => filter === 'all' || (filter === 'assigned' ? !!p.manager_id : !p.manager_id))
    .filter(p => !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || p.address?.toLowerCase().includes(search.toLowerCase()));

  const removeManager = (p) => {
    setConfirm({
      title: 'Remove Manager?',
      message: `${p.manager?.name} will lose access to "${p.name}" immediately.`,
      confirmLabel: 'Remove', danger: true,
      onConfirm: async () => {
        try {
          await managerService.removeManager(p.id);
          toast.success('Manager removed.');
          log({ action:'manager.removed', entityType:'parking', entityId: p.id, meta:{ parking_name: p.name } });
          load();
        } catch (err) { toast.error(err.message || 'Failed.'); }
      },
    });
  };

  return (
    <OwnerLayout title="Managers" subtitle="Assign dedicated managers to each parking location">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">

        {/* ── Stats row ── */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label:'Total Locations',  value: parkings.length,  color:'text-indigo-600', bg:'bg-white border-gray-100',
                icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5"/></svg> },
              { label:'Manager Assigned', value: assigned.length,  color:'text-green-600',  bg:'bg-white border-gray-100',
                icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
              { label:'Need Manager',     value: unassigned.length, color: unassigned.length > 0 ? 'text-amber-600' : 'text-gray-400', bg:'bg-white border-gray-100',
                icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg> },
              { label:'Coverage',         value: `${coverage}%`,   color: coverage === 100 ? 'text-green-600' : coverage >= 50 ? 'text-indigo-600' : 'text-amber-600', bg:'bg-white border-gray-100',
                icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg> },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl border shadow-sm p-3 sm:p-4 flex items-center gap-2.5 ${s.bg}`}>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0" style={{ color: s.color.replace('text-','').includes('indigo') ? '#4f46e5' : s.color.includes('green') ? '#16a34a' : s.color.includes('amber') ? '#d97706' : '#9ca3af' }}>
                  {s.icon}
                </div>
                <div className="min-w-0">
                  <p className={`text-xl sm:text-2xl font-extrabold leading-none ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Coverage bar ── */}
        {!loading && parkings.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Manager Coverage</p>
              <p className="text-xs font-bold text-gray-700">{assigned.length} of {parkings.length} locations</p>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width:`${coverage}%`, background: coverage === 100 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : coverage >= 50 ? 'linear-gradient(90deg,#6366f1,#2563eb)' : 'linear-gradient(90deg,#f59e0b,#f97316)' }}/>
            </div>
          </div>
        )}

        {/* ── Table card ── */}
        <div className="md:bg-white md:rounded-2xl md:border md:border-gray-100 md:shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 space-y-2.5">
            {/* Filter pills */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-full">
              {[
                { key:'all',        label:`All (${parkings.length})` },
                { key:'assigned',   label:`Assigned (${assigned.length})` },
                { key:'unassigned', label:`Unassigned (${unassigned.length})` },
              ].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all text-center ${
                    filter === f.key ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  style={filter === f.key ? { background:'linear-gradient(135deg,#6366f1,#2563eb)' } : {}}>
                  {f.label}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" placeholder="Search locations…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-50 transition-all"/>
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="divide-y divide-gray-50">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-4 w-48 bg-gray-100 rounded animate-pulse"/>
                  <div className="h-4 w-32 bg-gray-100 rounded animate-pulse ml-auto"/>
                  <div className="h-4 w-24 bg-gray-100 rounded animate-pulse"/>
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </div>
              <p className="text-sm text-gray-400">{search ? `No results for "${search}"` : 'No locations found.'}</p>
            </div>
          ) : (
            <>
            {/* Mobile cards */}
            <div className="md:hidden p-3 space-y-3">
              {visible.map(p => {
                const m = p.manager;
                return (
                  <div key={`m-${p.id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                    {/* Row 1: location + status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: m ? 'linear-gradient(135deg,#eef2ff,#e0e7ff)' : '#fefce8' }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            style={{ color: m ? '#4f46e5' : '#d97706' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5"/>
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400 truncate">{p.address}</p>
                        </div>
                      </div>
                      <span className={`flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {p.status}
                      </span>
                    </div>
                    {/* Row 2: manager info */}
                    {m ? (
                      <div className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5">
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                            {m.name.charAt(0)}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{m.name}</p>
                          <p className="text-xs text-gray-400 truncate">{m.email}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0"/>
                        <p className="text-xs font-semibold text-amber-700">No manager assigned</p>
                      </div>
                    )}
                    {/* Row 3: slots + rate + actions */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span><span className="font-bold text-gray-800">{p.available_slots}</span>/{p.total_slots} slots</span>
                        <span>${parseFloat(p.hourly_rate).toFixed(2)}/hr</span>
                      </div>
                      <div className="flex gap-1.5">
                        {m ? (
                          <>
                            <button onClick={() => setModal(p)}
                              className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-lg">
                              Replace
                            </button>
                            <button onClick={() => removeManager(p)}
                              className="text-xs font-semibold text-red-500 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg">
                              Remove
                            </button>
                          </>
                        ) : (
                          <button onClick={() => setModal(p)}
                            className="text-xs font-bold text-white px-3 py-1.5 rounded-lg"
                            style={{ background:'linear-gradient(135deg,#f59e0b,#f97316)' }}>
                            Assign
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background:'#fafbff' }}>
                    {['Location', 'Slots', 'Rate / hr', 'Manager', 'Status', 'Action'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap border-b border-gray-100">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visible.map(p => {
                    const m = p.manager;
                    return (
                      <tr key={p.id} className="group hover:bg-slate-50/60 transition-colors">

                        {/* Location */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ background: m ? 'linear-gradient(135deg,#eef2ff,#e0e7ff)' : '#fefce8' }}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                style={{ color: m ? '#4f46e5' : '#d97706' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">{p.name}</p>
                              <p className="text-xs text-gray-400 truncate max-w-[180px]">{p.address}</p>
                            </div>
                          </div>
                        </td>

                        {/* Slots */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-gray-800">{p.available_slots}</span>
                            <span className="text-xs text-gray-400">/ {p.total_slots}</span>
                          </div>
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: p.total_slots ? `${Math.round((p.available_slots/p.total_slots)*100)}%` : '0%',
                              background: p.available_slots/p.total_slots > 0.5 ? '#22c55e' : p.available_slots > 0 ? '#f59e0b' : '#ef4444',
                            }}/>
                          </div>
                        </td>

                        {/* Rate */}
                        <td className="px-5 py-4">
                          <span className="text-sm font-semibold text-gray-700">${parseFloat(p.hourly_rate).toFixed(2)}</span>
                        </td>

                        {/* Manager */}
                        <td className="px-5 py-4">
                          {m ? (
                            <div className="flex items-center gap-2.5">
                              <div className="relative flex-shrink-0">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                  style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                                  {m.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white"/>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate max-w-[140px]">{m.name}</p>
                                <p className="text-xs text-gray-400 truncate max-w-[140px]">{m.email}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"/>
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${
                            p.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'}`}>
                            {p.status}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4">
                          {m ? (
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => setModal(p)}
                                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                                Replace
                              </button>
                              <button onClick={() => removeManager(p)}
                                className="flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                                Remove
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setModal(p)}
                              className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-lg transition-all hover:opacity-90 whitespace-nowrap"
                              style={{ background:'linear-gradient(135deg,#f59e0b,#f97316)' }}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
                              Assign
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}

          {/* Footer count */}
          {!loading && visible.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">Showing {visible.length} of {parkings.length} location{parkings.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      </div>

      {modal && <ManagerModal parking={modal} onClose={() => setModal(null)} onDone={load}/>}
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)}/>
    </OwnerLayout>
  );
}
