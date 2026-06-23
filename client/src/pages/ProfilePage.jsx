import { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import { useAuth } from '../context/AuthContext';
import * as userService from '../services/userService';
import { formatDate, getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [tab,      setTab]      = useState('profile');

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
    <div className="min-h-screen dark:bg-gray-950"><Navbar />
      <div className="pt-16 flex justify-center items-center min-h-[50vh]">
        <div className="w-10 h-10 border-primary-600 border-t-transparent rounded-full animate-spin" style={{ borderWidth:3, borderStyle:'solid' }} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen dark:bg-gray-950">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="card flex items-center gap-5 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary-600 text-white flex items-center justify-center text-2xl font-bold flex-shrink-0">
              {getInitials(user.name)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="badge bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400 capitalize">{user.role}</span>
                <span className="text-xs text-gray-400">Member since {formatDate(user.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {[
              { key:'profile',  label:'Profile' },
              { key:'password', label:'Password' },
              ...(user.role==='driver' ? [{ key:'vehicles', label:'My Vehicles' }] : []),
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all
                  ${tab===t.key ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {tab==='profile' && (
            <form onSubmit={handleProfile} className="card space-y-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Edit Profile</h2>
              <div><label className="label">Full Name</label><input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required /></div>
              <div><label className="label">Email <span className="text-gray-400 font-normal">(cannot change)</span></label><input className="input opacity-60 cursor-not-allowed" value={user.email} disabled /></div>
              <div><label className="label">Phone</label><input className="input" placeholder="+1 555 0100" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
              <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'Saving…' : 'Save Changes'}</button>
            </form>
          )}

          {tab==='password' && (
            <form onSubmit={handlePassword} className="card space-y-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Change Password</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enter a new password for your account.</p>
              <div><label className="label">New Password</label><input type="password" required className="input" placeholder="Min. 6 characters" value={pwForm.newPassword} onChange={e=>setPwForm(p=>({...p,newPassword:e.target.value}))} /></div>
              <div><label className="label">Confirm New Password</label><input type="password" required className="input" placeholder="Repeat password" value={pwForm.confirmPassword} onChange={e=>setPwForm(p=>({...p,confirmPassword:e.target.value}))} /></div>
              <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'Changing…' : 'Change Password'}</button>
            </form>
          )}

          {tab==='vehicles' && (
            <div className="space-y-4">
              {vehicles.map(v => (
                <div key={v.id} className="card flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl flex-shrink-0">
                    {v.vehicle_type==='motorcycle' ? '🏍' : v.vehicle_type==='truck' ? '🚛' : '🚗'}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 dark:text-white font-mono">{v.vehicle_number}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{[v.vehicle_type,v.make,v.model,v.color].filter(Boolean).join(' · ')}</p>
                  </div>
                  <button onClick={() => handleDeleteVehicle(v.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Remove</button>
                </div>
              ))}
              <form onSubmit={handleAddVehicle} className="card space-y-4">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Add Vehicle</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Vehicle Number *</label><input required className="input uppercase" placeholder="NY-ABC-1234" value={vForm.vehicle_number} onChange={e=>setVForm(f=>({...f,vehicle_number:e.target.value}))} /></div>
                  <div><label className="label">Type</label>
                    <select className="input" value={vForm.vehicle_type} onChange={e=>setVForm(f=>({...f,vehicle_type:e.target.value}))}>
                      {['car','motorcycle','truck','van','other'].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div><label className="label">Make</label><input className="input" placeholder="Toyota" value={vForm.make} onChange={e=>setVForm(f=>({...f,make:e.target.value}))} /></div>
                  <div><label className="label">Model</label><input className="input" placeholder="Camry" value={vForm.model} onChange={e=>setVForm(f=>({...f,model:e.target.value}))} /></div>
                  <div><label className="label">Color</label><input className="input" placeholder="Silver" value={vForm.color} onChange={e=>setVForm(f=>({...f,color:e.target.value}))} /></div>
                </div>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Adding…' : '+ Add Vehicle'}</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
