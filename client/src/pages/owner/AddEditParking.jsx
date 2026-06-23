import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import OwnerLayout from '../../components/owner/OwnerLayout';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import * as parkingService from '../../services/parkingService';
import { log } from '../../services/activityService';
import toast from 'react-hot-toast';

const AMENITIES = ['CCTV','Security','EV Charging','Restrooms','Handicap Access','Shuttle Service','Car Wash','Key Card Access','Bicycle Racks','Lighting','24/7 Access'];

/* ── Section Wrapper ───────────────────────────────────── */
function Section({ number, title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#6366f1,#2563eb)' }}>
          {number}
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/* ── Field ─────────────────────────────────────────────── */
function Field({ label, required, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function AddEditParking() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const isEdit    = Boolean(id);

  const [loading,    setLoading]    = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [geocoding,  setGeocoding]  = useState(false);
  const [form, setForm] = useState({
    name:'', address:'', city:'', state:'', latitude:'', longitude:'',
    total_slots:'', hourly_rate:'', description:'',
    opening_time:'00:00', closing_time:'23:59', amenities:[],
  });

  useEffect(() => {
    if (!isEdit) return;
    parkingService.getById(id).then(p => {
      setForm({
        name: p.name, address: p.address, city: p.city||'', state: p.state||'',
        latitude: String(p.latitude), longitude: String(p.longitude),
        total_slots: String(p.total_slots), hourly_rate: String(p.hourly_rate),
        description: p.description||'',
        opening_time: p.opening_time?.slice(0,5)||'00:00',
        closing_time: p.closing_time?.slice(0,5)||'23:59',
        amenities: Array.isArray(p.amenities) ? p.amenities : JSON.parse(p.amenities||'[]'),
      });
    }).catch(() => toast.error('Failed to load.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const toggleAmenity = a => setForm(f => ({
    ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x => x!==a) : [...f.amenities, a],
  }));

  const handleGeocode = async () => {
    if (!form.address) return toast.error('Enter an address first.');
    setGeocoding(true);
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.address)}&limit=1`, { headers:{'Accept-Language':'en'} });
      const data = await res.json();
      if (data.length) {
        setForm(f => ({ ...f, latitude: String(parseFloat(data[0].lat).toFixed(6)), longitude: String(parseFloat(data[0].lon).toFixed(6)) }));
        toast.success('Coordinates fetched!');
      } else { toast.error('Address not found. Enter coordinates manually.'); }
    } catch { toast.error('Geocoding failed.'); }
    finally { setGeocoding(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      ...form,
      owner_id:    user.id,
      total_slots: parseInt(form.total_slots),
      available_slots: isEdit ? undefined : parseInt(form.total_slots),
      hourly_rate: parseFloat(form.hourly_rate),
      latitude:    parseFloat(form.latitude),
      longitude:   parseFloat(form.longitude),
      amenities:   form.amenities,
      status:      isEdit ? undefined : 'pending',
    };
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    try {
      if (isEdit) {
        await parkingService.update(id, payload);
        toast.success('Location updated!');
        log({ action:'parking.updated', entityType:'parking', entityId: parseInt(id), meta:{ parking_name: form.name } });
      } else {
        const created = await parkingService.create(payload);
        toast.success('Submitted for approval!');
        log({ action:'parking.created', entityType:'parking', entityId: created?.id, meta:{ parking_name: form.name } });
      }
      navigate('/owner/parking');
    } catch (err) { toast.error(err.message||'Failed to save.'); }
    finally { setSubmitting(false); }
  };

  return (
    <OwnerLayout
      title={isEdit ? 'Edit Location' : 'Add New Location'}
      subtitle={isEdit ? 'Update your parking location details.' : 'Submit a new location for admin approval.'}
      showTabs={false}
      back={{ to: '/owner/parking', label: 'Back to locations' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Section 1: Basic Info */}
            <Section number="1" title="Basic Information" subtitle="Name, address and location details">
              <div className="space-y-4">
                <Field label="Location Name" required>
                  <input name="name" required className="input" placeholder="e.g. Downtown Central Parking"
                    value={form.name} onChange={handle}/>
                </Field>

                <Field label="Street Address" required hint="Click Get Coords to auto-fill coordinates">
                  <div className="flex gap-2">
                    <input name="address" required className="input flex-1" placeholder="123 Main St, City"
                      value={form.address} onChange={handle}/>
                    <button type="button" onClick={handleGeocode} disabled={geocoding}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all disabled:opacity-50 flex-shrink-0">
                      {geocoding ? '…' : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          </svg>
                          Get Coords
                        </>
                      )}
                    </button>
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="City">
                    <input name="city" className="input" placeholder="New York" value={form.city} onChange={handle}/>
                  </Field>
                  <Field label="State">
                    <input name="state" className="input" placeholder="NY" value={form.state} onChange={handle}/>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Latitude" required>
                    <input name="latitude" required type="number" step="any" className="input font-mono" placeholder="40.712800"
                      value={form.latitude} onChange={handle}/>
                  </Field>
                  <Field label="Longitude" required>
                    <input name="longitude" required type="number" step="any" className="input font-mono" placeholder="-74.006000"
                      value={form.longitude} onChange={handle}/>
                  </Field>
                </div>

                <Field label="Description" hint="Describe security, access, special features, etc.">
                  <textarea name="description" rows={3} className="input resize-none" placeholder="Describe your parking location…"
                    value={form.description} onChange={handle}/>
                </Field>
              </div>
            </Section>

            {/* Section 2: Capacity & Pricing */}
            <Section number="2" title="Capacity & Pricing" subtitle="Slots, rates and operating hours">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Total Parking Slots" required>
                    <div className="relative">
                      <input name="total_slots" required type="number" min="1" className="input pr-12"
                        placeholder="50" value={form.total_slots} onChange={handle}/>
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">slots</span>
                    </div>
                  </Field>
                  <Field label="Hourly Rate (USD)" required>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input name="hourly_rate" required type="number" min="0" step="0.01" className="input pl-7"
                        placeholder="5.00" value={form.hourly_rate} onChange={handle}/>
                    </div>
                  </Field>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Operating Hours</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">Opening Time</p>
                      <input name="opening_time" type="time" className="input" value={form.opening_time} onChange={handle}/>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">Closing Time</p>
                      <input name="closing_time" type="time" className="input" value={form.closing_time} onChange={handle}/>
                    </div>
                  </div>
                </div>

                {/* Pricing preview */}
                {form.hourly_rate && (
                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                    <p className="text-xs font-semibold text-indigo-600 mb-2">Pricing Preview</p>
                    <div className="flex gap-4">
                      {[1,3,8,24].map(h => (
                        <div key={h} className="text-center">
                          <p className="text-sm font-bold text-indigo-700">${(parseFloat(form.hourly_rate)||0)*h}</p>
                          <p className="text-[10px] text-indigo-400">{h}h</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* Section 3: Amenities */}
            <Section number="3" title="Amenities" subtitle="Select all features available at this location">
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map(a => {
                  const active = form.amenities.includes(a);
                  return (
                    <button key={a} type="button" onClick={() => toggleAmenity(a)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                      }`}>
                      {active && (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                        </svg>
                      )}
                      {a}
                    </button>
                  );
                })}
              </div>
              {form.amenities.length > 0 && (
                <p className="text-xs text-indigo-600 mt-3 font-medium">{form.amenities.length} amenit{form.amenities.length!==1?'ies':'y'} selected</p>
              )}
            </Section>

            {/* Approval notice */}
            {!isEdit && (
              <div className="flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Pending Admin Approval</p>
                  <p className="text-xs text-amber-600 mt-0.5">Your location will be reviewed and approved by an admin before it appears publicly. This usually takes 24 hours.</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pb-4">
              <Link to="/owner/parking" className="btn-secondary flex-1 justify-center">Cancel</Link>
              <button type="submit" disabled={submitting}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)', boxShadow:'0 4px 14px rgba(99,102,241,0.3)' }}>
                {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Submit for Approval'}
              </button>
            </div>
          </form>
      </div>
    </OwnerLayout>
  );
}
