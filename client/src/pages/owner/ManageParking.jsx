import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import OwnerLayout from '../../components/owner/OwnerLayout';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { log } from '../../services/activityService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import * as parkingService from '../../services/parkingService';
import * as managerService from '../../services/managerService';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

/* ── Assign Manager Modal ───────────────────────────────── */
function AssignManagerModal({ parking, onClose, onAssigned }) {
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
      const { data, error } = await supabase.rpc('owner_create_manager', {
        p_name:       form.name.trim(),
        p_email:      form.email.toLowerCase().trim(),
        p_password:   form.password,
        p_parking_id: parking.id,
      });
      if (error) throw new Error(error.message);
      toast.success(`Manager account created for ${form.name}!`);
      onAssigned();
      setDone({ name: form.name, email: form.email, password: form.password });
    } catch (err) { toast.error(err.message || 'Failed.'); }
    finally { setLoading(false); }
  };

  const doSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const { data } = await supabase.from('users').select('id,name,email,role').ilike('email',`%${search}%`).limit(5);
      setResults(data||[]);
      if (!data?.length) toast.error('No user found.');
    } finally { setLoading(false); }
  };

  const assign = async (u) => {
    setLoading(true);
    try {
      const { supabase } = await import('../../lib/supabase');
      if (u.role !== 'manager') await supabase.from('users').update({ role: 'manager' }).eq('id', u.id);
      await managerService.assignManager(parking.id, u.id);
      toast.success(`${u.name} assigned!`);
      onAssigned(); onClose();
    } catch (err) { toast.error(err.message||'Failed.'); }
    finally { setLoading(false); }
  };

  const remove = async () => {
    setLoading(true);
    try { await managerService.removeManager(parking.id); toast.success('Manager removed.'); onAssigned(); onClose(); }
    catch (err) { toast.error(err.message||'Failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
        <div className="px-6 pt-6 pb-4" style={{ background:'linear-gradient(135deg,#1e1b4b,#4338ca)', }}>
          <h2 className="text-lg font-bold text-white">Manage Access</h2>
          <p className="text-indigo-200 text-sm mt-0.5">{parking.name}</p>
        </div>

        {parking.manager_id && (
          <div className="mx-6 mt-5 p-3 rounded-xl bg-green-50 border border-green-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-0.5">Current Manager</p>
              <p className="text-sm font-semibold text-green-800">{parking.manager_name || 'Assigned'}</p>
            </div>
            <button onClick={remove} disabled={loading} className="text-xs font-semibold text-red-500 bg-white border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50">Remove</button>
          </div>
        )}

        <div className="flex gap-1 mx-6 mt-5">
          {[{key:'create',label:'Create New'},{key:'assign',label:'Assign Existing'}].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab===t.key ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600 bg-gray-50'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-6 py-5">
          {tab === 'create' && (
            done ? (
              <div className="text-center py-2">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Account Created!</h3>
                <p className="text-xs text-gray-500 mb-3">Share login credentials with <strong>{done?.name}</strong>:</p>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-left space-y-2 mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Email</p>
                    <p className="text-xs font-mono font-bold text-gray-900 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 select-all">{done?.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Password</p>
                    <p className="text-xs font-mono font-bold text-gray-900 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 select-all">{done?.password}</p>
                  </div>
                  <p className="text-[10px] text-gray-400">Login at <strong>parkbangla.com/login</strong></p>
                </div>
                <button onClick={onClose} className="btn-primary w-full text-sm">Done</button>
              </div>
            ) : (
              <form onSubmit={createManager} className="space-y-3">
                <div>
                  <label className="label">Full Name *</label>
                  <input name="name" type="text" required className="input" placeholder="John Smith" value={form.name} onChange={handle}/>
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input name="email" type="email" required className="input" placeholder="manager@example.com" value={form.email} onChange={handle}/>
                </div>
                <div>
                  <label className="label">Password *</label>
                  <div className="relative">
                    <input name="password" type={showPw ? 'text' : 'password'} required
                      className="input pr-10" placeholder="Min. 6 characters"
                      value={form.password} onChange={handle}/>
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-1">
                  {loading ? 'Creating account…' : 'Create Manager Account'}
                </button>
              </form>
            )
          )}
          {tab === 'assign' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 mb-2">Search any registered user by email and assign them as manager.</p>
              <div className="flex gap-2">
                <input className="input flex-1 text-sm" placeholder="Search by email…"
                  value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()}/>
                <button onClick={doSearch} disabled={loading} className="btn-primary px-4 text-sm">{loading?'…':'Search'}</button>
              </div>
              {results.length > 0 && (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  {results.map((u,i) => (
                    <div key={u.id} className={`flex items-center gap-3 p-3 hover:bg-gray-50 ${i<results.length-1?'border-b border-gray-50':''}`}>
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">{u.name.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                      <button onClick={()=>assign(u)} disabled={loading} className="btn-primary text-xs px-3 py-1.5">Assign</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="px-6 pb-5"><button onClick={onClose} className="btn-secondary w-full">Close</button></div>
      </div>
    </div>
  );
}

/* ── Availability Ring ─────────────────────────────────── */
function AvailRing({ available, total }) {
  const pct   = total > 0 ? available / total : 0;
  const r     = 28;
  const circ  = 2 * Math.PI * r;
  const color = pct === 0 ? '#ef4444' : pct < 0.3 ? '#f97316' : pct < 0.6 ? '#eab308' : '#22c55e';
  return (
    <div className="flex flex-col items-center">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6"/>
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${circ * pct} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 36 36)" style={{ transition:'stroke-dasharray 0.8s ease' }}/>
        <text x="36" y="38" textAnchor="middle" fontSize="13" fontWeight="800" fill={color}>{available}</text>
        <text x="36" y="51" textAnchor="middle" fontSize="8" fill="#94a3b8">/ {total}</text>
      </svg>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Slots</p>
    </div>
  );
}

/* ── Parking Card ──────────────────────────────────────── */
function ParkingCard({ p, onDelete, onUpdate, onManageManager }) {
  const [slots,    setSlots]    = useState(p.available_slots);
  const [editing,  setEditing]  = useState(false);
  const [updating, setUpdating] = useState(false);

  const saveSlots = async () => {
    setUpdating(true);
    try {
      await parkingService.updateAvailability(p.id, slots);
      toast.success('Availability updated!');
      setEditing(false);
      onUpdate();
    } catch (err) { toast.error(err.message||'Failed.'); setSlots(p.available_slots); }
    finally { setUpdating(false); }
  };

  const statusStyle = {
    approved: { bg:'bg-green-50',  text:'text-green-700',  border:'border-green-200',  dot:'bg-green-500'  },
    pending:  { bg:'bg-amber-50',  text:'text-amber-700',  border:'border-amber-200',  dot:'bg-amber-500'  },
    rejected: { bg:'bg-red-50',    text:'text-red-700',    border:'border-red-200',    dot:'bg-red-500'    },
    inactive: { bg:'bg-gray-100',  text:'text-gray-600',   border:'border-gray-200',   dot:'bg-gray-400'   },
  }[p.status] || {};

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">{p.name}</h3>
            <p className="text-xs text-gray-400 truncate mt-0.5">{p.address}</p>
            {p.manager_id && (
              <p className="text-[10px] font-semibold text-indigo-500 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block"/>
                Manager assigned
              </p>
            )}
          </div>
          <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}/>
            {p.status}
          </span>
        </div>

        {/* Availability ring + stats */}
        <div className="flex items-center gap-4 mb-4">
          <AvailRing available={slots} total={p.total_slots}/>
          <div className="flex-1 space-y-2">
            {[
              { label:'Hourly Rate', value: formatCurrency(p.hourly_rate)+'/hr' },
              { label:'Hours',       value: `${p.opening_time?.slice(0,5)||'00:00'} – ${p.closing_time?.slice(0,5)||'23:59'}` },
            ].map(d => (
              <div key={d.label} className="flex justify-between items-center">
                <span className="text-xs text-gray-400">{d.label}</span>
                <span className="text-xs font-semibold text-gray-700">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Slot quick update */}
        {p.status === 'approved' && (
          <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
            {editing ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setSlots(s => Math.max(0,s-1))} disabled={slots<=0}
                  className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 text-base font-bold hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center">−</button>
                <input type="number" min="0" max={p.total_slots} value={slots}
                  onChange={e => setSlots(Math.max(0,Math.min(p.total_slots,parseInt(e.target.value)||0)))}
                  className="flex-1 text-center text-sm font-bold text-gray-900 border border-gray-200 rounded-lg py-1 outline-none focus:border-indigo-400"/>
                <button onClick={() => setSlots(s => Math.min(p.total_slots,s+1))} disabled={slots>=p.total_slots}
                  className="w-7 h-7 rounded-lg border border-gray-200 text-gray-600 text-base font-bold hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center">+</button>
                <button onClick={saveSlots} disabled={updating}
                  className="text-xs font-bold text-white bg-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {updating?'…':'Save'}
                </button>
                <button onClick={() => { setEditing(false); setSlots(p.available_slots); }}
                  className="text-xs font-medium text-gray-400 hover:text-gray-600">✕</button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)}
                className="w-full text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center justify-center gap-1.5 py-0.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
                Update Available Slots
              </button>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <Link to={`/owner/parking/${p.id}/edit`}
            className="flex-1 text-center text-xs font-semibold py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all">
            Edit
          </Link>
          <button onClick={() => onManageManager(p)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl border transition-all ${p.manager_id ? 'border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {p.manager_id ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                Manager
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                </svg>
                Manager
              </>
            )}
          </button>
          <button onClick={() => onDelete(p.id, p.name)}
            className="flex-1 text-xs font-semibold py-2 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-all">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────── */
export default function ManageParking() {
  const { user }   = useAuth();
  const [parkings, setParkings]    = useState([]);
  const [loading,  setLoading]     = useState(true);
  const [modal,    setModal]       = useState(null);
  const [confirm,  setConfirm]     = useState(null);
  const [filter,   setFilter]      = useState('all');

  const load = () => {
    setLoading(true);
    parkingService.getOwnerParkings(user.id).then(setParkings).finally(() => setLoading(false));
  };

  useEffect(() => { if (user) load(); }, [user]);

  const handleDelete = (id, name) => {
    setConfirm({
      title:        `Delete "${name}"?`,
      message:      'This action is permanent and cannot be undone. All reservations for this location will also be removed.',
      confirmLabel: 'Delete',
      danger:       true,
      onConfirm:    async () => {
        try {
          await parkingService.remove(id);
          toast.success('Parking location deleted.');
          log({ action:'parking.deleted', entityType:'parking', entityId: id, meta:{ parking_name: name } });
          load();
        } catch (err) { toast.error(err.message || 'Failed to delete.'); }
      },
    });
  };

  const filtered = filter === 'all' ? parkings : parkings.filter(p => p.status === filter);
  const FILTERS  = [
    { key:'all',      label:`All (${parkings.length})` },
    { key:'approved', label:`Active (${parkings.filter(p=>p.status==='approved').length})` },
    { key:'pending',  label:`Pending (${parkings.filter(p=>p.status==='pending').length})` },
  ];

  return (
    <OwnerLayout
      title="Parking Locations"
      subtitle={`${parkings.length} location${parkings.length!==1?'s':''} total`}
      action={
        <Link to="/owner/parking/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white border border-white/25 hover:bg-white/10 transition-all"
          style={{ background:'rgba(255,255,255,0.12)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          Add Location
        </Link>
      }>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="flex gap-2 mb-6">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all
                  ${filter===f.key ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-200 hover:text-indigo-600'}`}>
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><LoadingSpinner size="lg"/></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-5m-9 0H3m2 0h5"/>
                </svg>
              </div>
              <p className="text-gray-500 mb-4">No parking locations found.</p>
              <Link to="/owner/parking/new" className="btn-primary">Add First Location</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map(p => (
                <ParkingCard key={p.id} p={p}
                  onDelete={handleDelete}
                  onUpdate={load}
                  onManageManager={setModal}
                />
              ))}
            </div>
          )}
        </div>

      {modal && (
        <AssignManagerModal parking={modal} onClose={() => setModal(null)} onAssigned={load}/>
      )}
      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />
    </OwnerLayout>
  );
}
