import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const GroupIcon = ({ group }) => {
  const icons = {
    Platform: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
      </svg>
    ),
    'Booking Rules': (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
    ),
    Revenue: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    ),
    System: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
  };
  return icons[group] || null;
};

const SETTING_DEFS = [
  {
    group: 'Platform',
    items: [
      { key:'platform_name',   label:'Platform Name',         type:'text',   placeholder:'ParkBangla',         hint:'Displayed in emails and UI.' },
      { key:'support_email',   label:'Support Email',         type:'email',  placeholder:'support@parkeasy.com' },
      { key:'currency',        label:'Currency Code',         type:'text',   placeholder:'USD',               hint:'ISO 4217 currency code.' },
    ],
  },
  {
    group: 'Booking Rules',
    items: [
      { key:'min_booking_hours', label:'Minimum Booking (hours)', type:'number', placeholder:'1',  hint:'Drivers cannot book for less than this.' },
      { key:'max_booking_hours', label:'Maximum Booking (hours)', type:'number', placeholder:'72', hint:'Drivers cannot book for more than this.' },
    ],
  },
  {
    group: 'Revenue',
    items: [
      { key:'commission_rate', label:'Platform Commission (%)', type:'number', placeholder:'10', hint:'Percentage taken from each booking revenue.' },
    ],
  },
  {
    group: 'System',
    items: [
      { key:'maintenance_mode', label:'Maintenance Mode', type:'toggle', hint:'When ON, drivers cannot make new bookings. Existing reservations are unaffected.' },
    ],
  },
];

export default function AdminSettings() {
  const [values,  setValues]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);
  const [dirty,   setDirty]   = useState(false);

  useEffect(() => {
    supabase.from('platform_settings').select('key, value')
      .then(({ data }) => {
        const map = {};
        (data||[]).forEach(r => { map[r.key] = typeof r.value === 'string' ? r.value.replace(/^"|"$/g,'') : r.value; });
        setValues(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const handle = (key, val) => { setValues(v => ({ ...v, [key]: val })); setDirty(true); };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updates = Object.entries(values).map(([key, value]) => ({
        key,
        value: typeof value === 'boolean' ? value : `"${value}"`,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('platform_settings').upsert(updates, { onConflict: 'key' });
      if (error) throw error;
      toast.success('Settings saved!');
      setDirty(false);
    } catch (err) { toast.error(err.message || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <AdminPageHeader
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
          label="Admin" title="Platform Settings"
          subtitle="Configure global platform behaviour"
          color="#6b7280"
        />

        {loading ? (
          <div className="space-y-5">{Array(4).fill(0).map((_,i)=><div key={i} className="h-32 admin-card rounded-2xl animate-pulse"/>)}</div>
        ) : (
          <form onSubmit={save} className="space-y-5">
            {SETTING_DEFS.map(group => (
              <div key={group.group} className="admin-card rounded-2xl overflow-hidden">
                <div className="px-4 sm:px-6 py-3.5 border-b border-gray-100 flex items-center gap-2.5"
                  style={{ background:'linear-gradient(to right,#eef2ff,#f5f3ff)' }}>
                  <span className="text-indigo-500"><GroupIcon group={group.group} /></span>
                  <p className="text-sm font-bold text-indigo-700">{group.group}</p>
                </div>
                <div className="p-4 sm:p-6 space-y-5">
                  {group.items.map(item => (
                    <div key={item.key}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{item.label}</label>
                      {item.type === 'toggle' ? (
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => handle(item.key, !values[item.key])}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${values[item.key] ? 'bg-red-500' : 'bg-gray-200'}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${values[item.key] ? 'translate-x-6' : 'translate-x-1'}`}/>
                          </button>
                          <span className={`text-sm font-medium ${values[item.key] ? 'text-red-600' : 'text-gray-500'}`}>
                            {values[item.key] ? 'ON — Bookings disabled' : 'OFF — Platform running normally'}
                          </span>
                        </div>
                      ) : (
                        <input
                          type={item.type}
                          value={values[item.key] || ''}
                          onChange={e => handle(item.key, e.target.value)}
                          placeholder={item.placeholder}
                          className="input max-w-sm"
                          min={item.type === 'number' ? 0 : undefined}
                          step={item.type === 'number' ? 1 : undefined}
                        />
                      )}
                      {item.hint && <p className="text-xs text-gray-400 mt-1.5">{item.hint}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex gap-3 pb-4">
              <button type="button" onClick={() => window.location.reload()} className="btn-secondary">
                Reset
              </button>
              <button type="submit" disabled={saving || !dirty}
                className="btn-primary flex-1 disabled:opacity-50">
                {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
