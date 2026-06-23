import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { useAuth } from '../context/AuthContext';
import * as userService from '../services/userService';
import { formatDate, getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';

const inp = 'w-full px-4 py-3 rounded-xl text-sm border border-gray-200 bg-white text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all';
const lbl = 'block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5';

const VEHICLE_COLORS = {
  car:        { bg:'#eff6ff', color:'#2563eb', emoji:'🚗' },
  motorcycle: { bg:'#fdf4ff', color:'#9333ea', emoji:'🏍️' },
  truck:      { bg:'#fff7ed', color:'#ea580c', emoji:'🚛' },
  van:        { bg:'#f0fdf4', color:'#16a34a', emoji:'🚐' },
  other:      { bg:'#f8fafc', color:'#64748b', emoji:'🚙' },
};

const ROLE_CONFIG = {
  driver:  { bg:'#eff6ff', color:'#2563eb',  label:'Driver'  },
  owner:   { bg:'#eef2ff', color:'#4f46e5',  label:'Owner'   },
  manager: { bg:'#f5f3ff', color:'#7c3aed',  label:'Manager' },
  admin:   { bg:'#fef3c7', color:'#d97706',  label:'Admin'   },
};

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [tab,      setTab]      = useState('profile');
  const [showPw,   setShowPw]   = useState({ new: false, confirm: false });

  const [form,   setForm]   = useState({ name:'', phone:'' });
  const [pwForm, setPwForm] = useState({ newPassword:'', confirmPassword:'' });
  const [vForm,  setVForm]  = useState({ vehicle_number:'', vehicle_type:'car', make:'', model:'', color:'' });

  useEffect(() => {
    if (!user) return;
    setForm({ name: user.name||'', phone: user.phone||'' });
    userService.getVehicles(user.id).then(setVehicles).finally(() => setLoading(false));
  }, [user]);

  const handleProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const updated = await userService.updateProfile(user.id, form);
      updateUser(updated);
      toast.success('Profile updated!');
    } catch (err) { toast.error(err.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match.');
    if (pwForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters.');
    setSaving(true);
    try {
      await userService.changePassword(pwForm.newPassword);
      toast.success('Password changed!');
      setPwForm({ newPassword:'', confirmPassword:'' });
    } catch (err) { toast.error(err.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const v = await userService.addVehicle(user.id, vForm);
      setVehicles(prev => [...prev, v]);
      setVForm({ vehicle_number:'', vehicle_type:'car', make:'', model:'', color:'' });
      toast.success('Vehicle added!');
    } catch (err) { toast.error(err.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm('Remove this vehicle?')) return;
    try {
      await userService.deleteVehicle(id);
      setVehicles(prev => prev.filter(v => v.id !== id));
      toast.success('Vehicle removed.');
    } catch (err) { toast.error(err.message || 'Failed.'); }
  };

  if (!user || loading) return (
    <div className="min-h-screen" style={{ background:'#f8fafc' }}>
      <Navbar />
      <div className="pt-16 flex justify-center items-center min-h-[50vh]">
        <div className="w-10 h-10 rounded-full animate-spin"
          style={{ border:'3px solid #6366f1', borderTopColor:'transparent' }}/>
      </div>
    </div>
  );

  const roleConf = ROLE_CONFIG[user.role] || ROLE_CONFIG.driver;

  const tabs = [
    { key:'profile',  label:'Profile',      icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> },
    { key:'password', label:'Password',     icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg> },
    ...(user.role==='driver' ? [{ key:'vehicles', label:'Vehicles', icon:<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.5.5M13 16H3m10 0h1m3-10h-3a2 2 0 00-2 2v1h7.5L19 7l-2-1z"/></svg> }] : []),
  ];

  return (
    <div className="min-h-screen pb-20 lg:pb-0" style={{ background:'#f8fafc' }}>
      <Navbar />

      {/* ── Hero ── */}
      <div className="relative overflow-hidden"
        style={{ background:'linear-gradient(135deg,#0f0c29 0%,#1e1b4b 35%,#312e81 70%,#4f46e5 100%)' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10"
            style={{ background:'radial-gradient(circle,#818cf8,transparent)', filter:'blur(40px)' }}/>
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize:'28px 28px' }}/>
        </div>

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold"
                style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)', boxShadow:'0 6px 18px rgba(99,102,241,0.4)' }}>
                {getInitials(user.name)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white"/>
            </div>

            {/* Info */}
            <div className="text-center sm:text-left flex-1 min-w-0 pb-1">
              <h1 className="text-xl font-extrabold text-white truncate">{user.name}</h1>
              <p className="text-indigo-200/70 text-sm truncate">{user.email}</p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 flex-wrap">
                <span className="text-xs font-bold px-3 py-1 rounded-full capitalize"
                  style={{ background:`${roleConf.color}30`, color:'#fff', border:`1px solid ${roleConf.color}50` }}>
                  {roleConf.label}
                </span>
                {user.created_at && (
                  <span className="text-xs text-indigo-300/60">Member since {formatDate(user.created_at)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}>
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Profile tab ── */}
        {tab === 'profile' && (
          <form onSubmit={handleProfile} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Edit Profile</h2>
                <p className="text-xs text-gray-400">Update your personal information</p>
              </div>
            </div>

            <div>
              <label className={lbl}>Full Name</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                <input className={`${inp} pl-10`} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required placeholder="Your full name"/>
              </div>
            </div>

            <div>
              <label className={lbl}>Email <span className="text-gray-400 font-normal normal-case">(cannot change)</span></label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                <input className={`${inp} pl-10 opacity-50 cursor-not-allowed`} value={user.email} disabled/>
              </div>
            </div>

            <div>
              <label className={lbl}>Phone</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                <input className={`${inp} pl-10`} placeholder="+880 1xxx xxxxxx" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/>
              </div>
            </div>

            <button type="submit" disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)', boxShadow:'0 4px 14px rgba(99,102,241,0.35)' }}>
              {saving ? <span className="flex items-center justify-center gap-2"><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Saving…</span> : 'Save Changes'}
            </button>
          </form>
        )}

        {/* ── Password tab ── */}
        {tab === 'password' && (
          <form onSubmit={handlePassword} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Change Password</h2>
                <p className="text-xs text-gray-400">Choose a strong password for your account</p>
              </div>
            </div>

            {[
              { key:'newPassword',     label:'New Password',     ph:'Min. 6 characters', show: showPw.new,     toggle: () => setShowPw(p=>({...p,new:!p.new}))     },
              { key:'confirmPassword', label:'Confirm Password', ph:'Repeat password',   show: showPw.confirm, toggle: () => setShowPw(p=>({...p,confirm:!p.confirm})) },
            ].map(f => (
              <div key={f.key}>
                <label className={lbl}>{f.label}</label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  <input type={f.show ? 'text' : 'password'} required className={`${inp} pl-10 pr-10`} placeholder={f.ph}
                    value={pwForm[f.key]} onChange={e=>setPwForm(p=>({...p,[f.key]:e.target.value}))}/>
                  <button type="button" onClick={f.toggle} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {f.show
                      ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    }
                  </button>
                </div>
              </div>
            ))}

            {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
              <p className="text-xs text-red-500 -mt-2">Passwords don't match</p>
            )}

            <button type="submit" disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow:'0 4px 14px rgba(245,158,11,0.35)' }}>
              {saving ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        )}

        {/* ── Vehicles tab ── */}
        {tab === 'vehicles' && (
          <div className="space-y-4">

            {/* Vehicle list */}
            {vehicles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-12 gap-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl">🚗</div>
                <p className="text-sm font-semibold text-gray-500">No vehicles added yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vehicles.map(v => {
                  const vc = VEHICLE_COLORS[v.vehicle_type] || VEHICLE_COLORS.other;
                  return (
                    <div key={v.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: vc.bg }}>
                        {vc.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 font-mono text-sm">{v.vehicle_number}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
                            style={{ background: vc.bg, color: vc.color }}>
                            {v.vehicle_type}
                          </span>
                          {[v.make, v.model, v.color].filter(Boolean).map((d, i) => (
                            <span key={i} className="text-[11px] text-gray-400">{d}</span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteVehicle(v.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 transition-all flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add vehicle form */}
            <form onSubmit={handleAddVehicle} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4"/></svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Add Vehicle</h2>
                  <p className="text-xs text-gray-400">Register a new vehicle to your account</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className={lbl}>Plate Number *</label>
                  <input required className={`${inp} uppercase`} placeholder="NY-ABC-1234"
                    value={vForm.vehicle_number} onChange={e=>setVForm(f=>({...f,vehicle_number:e.target.value}))}/>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className={lbl}>Type</label>
                  <select className={inp} value={vForm.vehicle_type} onChange={e=>setVForm(f=>({...f,vehicle_type:e.target.value}))}>
                    {['car','motorcycle','truck','van','other'].map(t=>(
                      <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Make</label>
                  <input className={inp} placeholder="Toyota" value={vForm.make} onChange={e=>setVForm(f=>({...f,make:e.target.value}))}/>
                </div>
                <div>
                  <label className={lbl}>Model</label>
                  <input className={inp} placeholder="Camry" value={vForm.model} onChange={e=>setVForm(f=>({...f,model:e.target.value}))}/>
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Color</label>
                  <input className={inp} placeholder="Silver" value={vForm.color} onChange={e=>setVForm(f=>({...f,color:e.target.value}))}/>
                </div>
              </div>

              <button type="submit" disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background:'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow:'0 4px 14px rgba(34,197,94,0.3)' }}>
                {saving ? 'Adding…' : '+ Add Vehicle'}
              </button>
            </form>
          </div>
        )}

        {/* ── Sign Out ── */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button onClick={async () => { await logout(); navigate('/'); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-red-500 border border-red-200 bg-white hover:bg-red-50 hover:border-red-300 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Sign Out
          </button>
        </div>

      </div>
    </div>
  );
}
