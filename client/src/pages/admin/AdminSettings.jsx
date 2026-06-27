import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const inp = 'w-full max-w-sm px-4 py-2.5 rounded-xl text-sm border border-gray-200 bg-white text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all';

const GROUP_CONFIG = {
  Platform:       { color:'#6366f1', bg:'#eef2ff', icon:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/> },
  'Booking Rules':{ color:'#3b82f6', bg:'#eff6ff', icon:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/> },
  Revenue:        { color:'#22c55e', bg:'#f0fdf4', icon:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1"/> },
  System:         { color:'#f59e0b', bg:'#fffbeb', icon:<><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></> },
};

const SETTING_DEFS = [
  { group:'Platform', items:[
    { key:'platform_name', label:'Platform Name', type:'text', placeholder:'ParkBangla', hint:'Displayed in emails and the UI.' },
    { key:'support_email', label:'Support Email', type:'email', placeholder:'support@parkbangla.com' },
    { key:'currency', label:'Currency Code', type:'text', placeholder:'BDT', hint:'ISO 4217 currency code (e.g. BDT, USD, EUR).' },
  ]},
  { group:'Booking Rules', items:[
    { key:'min_booking_hours', label:'Minimum Booking', type:'number', placeholder:'1', unit:'hours', hint:'Drivers cannot book for less than this duration.' },
    { key:'max_booking_hours', label:'Maximum Booking', type:'number', placeholder:'72', unit:'hours', hint:'Drivers cannot book for more than this duration.' },
  ]},
  { group:'Revenue', items:[
    { key:'commission_rate', label:'Platform Commission', type:'number', placeholder:'10', unit:'%', hint:'Percentage taken from each booking revenue.' },
  ]},
  { group:'System', items:[
    { key:'maintenance_mode', label:'Maintenance Mode', type:'toggle', hint:'When ON, drivers cannot make new bookings. Existing reservations are unaffected.' },
  ]},
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
      }).finally(() => setLoading(false));
  }, []);

  const handle = (key, val) => { setValues(v => ({ ...v, [key]: val })); setDirty(true); };

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const updates = Object.entries(values).map(([key, value]) => ({
        key, value: typeof value === 'boolean' ? value : `"${value}"`, updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('platform_settings').upsert(updates, { onConflict:'key' });
      if (error) throw error;
      toast.success('Settings saved successfully!');
      setDirty(false);
    } catch (err) { toast.error(err.message || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <AdminPageHeader
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
          label="Admin" title="Platform Settings"
          subtitle="Configure global platform behaviour"
          color="#6366f1"
        />

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{Array(4).fill(0).map((_,i)=><div key={i} className="h-48 rounded-2xl bg-gray-100 animate-pulse"/>)}</div>
        ) : (
          <form onSubmit={save}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {SETTING_DEFS.map(group => {
              const gc = GROUP_CONFIG[group.group] || {};
              return (
                <div key={group.group} className="rounded-2xl overflow-hidden"
                  style={{ border:'1px solid rgba(0,0,0,0.07)', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>

                  {/* Group header */}
                  <div className="flex items-center gap-3 px-5 py-4"
                    style={{ background:`linear-gradient(135deg,${gc.color}12,${gc.color}06)`, borderBottom:`1px solid ${gc.color}15` }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background:`linear-gradient(135deg,${gc.color},${gc.color}cc)`, boxShadow:`0 4px 10px ${gc.color}40` }}>
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">{gc.icon}</svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: gc.color }}>{group.group}</p>
                      <p className="text-xs text-gray-400">{group.items.length} setting{group.items.length!==1?'s':''}</p>
                    </div>
                  </div>

                  {/* Group body */}
                  <div className="bg-white px-5 py-5 space-y-5">
                    {group.items.map(item => (
                      <div key={item.key} className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6">
                        {/* Label side */}
                        <div className="sm:w-48 flex-shrink-0">
                          <label className="text-sm font-semibold text-gray-800">{item.label}</label>
                          {item.hint && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{item.hint}</p>}
                        </div>
                        {/* Control side */}
                        <div className="flex-1">
                          {item.type === 'toggle' ? (
                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => handle(item.key, !values[item.key])}
                                className="relative inline-flex h-7 w-12 items-center rounded-full transition-all flex-shrink-0"
                                style={{ background: values[item.key] ? '#ef4444' : '#e5e7eb' }}>
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${values[item.key] ? 'translate-x-6' : 'translate-x-1'}`}/>
                              </button>
                              <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${values[item.key] ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${values[item.key] ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}/>
                                {values[item.key] ? 'Maintenance ON' : 'Platform Online'}
                              </div>
                            </div>
                          ) : (
                            <div className="relative">
                              <input
                                type={item.type}
                                value={values[item.key] || ''}
                                onChange={e => handle(item.key, e.target.value)}
                                placeholder={item.placeholder}
                                className={inp}
                                min={item.type === 'number' ? 0 : undefined}
                                step={item.type === 'number' ? 1 : undefined}
                              />
                              {item.unit && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none">{item.unit}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            </div>{/* end grid */}
            {/* Save bar */}
            <div className="flex items-center gap-3 pt-2 pb-6">
              <button type="button" onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all">
                Reset
              </button>
              <button type="submit" disabled={saving || !dirty}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 hover:opacity-90"
                style={{ background: dirty ? 'linear-gradient(135deg,#6366f1,#2563eb)' : '#9ca3af',
                  boxShadow: dirty ? '0 4px 14px rgba(99,102,241,0.35)' : 'none' }}>
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Saving…
                  </span>
                ) : dirty ? 'Save Changes' : '✓ All Saved'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
