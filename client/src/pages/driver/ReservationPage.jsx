import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import * as parkingService from '../../services/parkingService';
import * as userService from '../../services/userService';
import * as reservationService from '../../services/reservationService';
import { log } from '../../services/activityService';
import { formatCurrency, calcHours } from '../../utils/helpers';
import toast from 'react-hot-toast';

const toLocalInput = (date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,16);
};

export default function ReservationPage() {
  const { parkingId } = useParams();
  const navigate      = useNavigate();
  const { user }      = useAuth();
  const [parking,    setParking]   = useState(null);
  const [vehicles,   setVehicles]  = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [submitting, setSubmitting]= useState(false);

  const now   = new Date(); now.setMinutes(now.getMinutes()+15);
  const later = new Date(now.getTime()+2*3600000);

  const [form, setForm] = useState({
    vehicle_number:'', vehicle_type:'car',
    start_time: toLocalInput(now), end_time: toLocalInput(later),
    notes:'',
  });

  useEffect(() => {
    Promise.all([
      parkingService.getById(parkingId),
      user ? userService.getVehicles(user.id) : Promise.resolve([]),
    ]).then(([p, v]) => {
      setParking(p);
      setVehicles(v);
      if (v.length) setForm(f => ({ ...f, vehicle_number:v[0].vehicle_number, vehicle_type:v[0].vehicle_type }));
    }).catch(() => toast.error('Failed to load data.'))
      .finally(() => setLoading(false));
  }, [parkingId, user]);

  if (loading) return <PageLoader/>;

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const hours  = Math.max(calcHours(form.start_time, form.end_time), 1);
  const total  = parking ? hours * parseFloat(parking.hourly_rate) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (new Date(form.end_time) <= new Date(form.start_time)) return toast.error('End time must be after start time.');
    setSubmitting(true);
    try {
      const res = await reservationService.create({
        parking, vehicleNumber:form.vehicle_number, vehicleType:form.vehicle_type,
        startTime:form.start_time, endTime:form.end_time, notes:form.notes,
      });
      log({ action:'reservation.created', entityType:'reservation', meta:{ vehicle_number:form.vehicle_number.toUpperCase(), parking_name:parking.name } });
      toast.success('Reservation confirmed!');
      navigate('/booking/success', { state: { booking: { ...res, vehicle_type: form.vehicle_type }, parking } });
    } catch (err) { toast.error(err.message||'Failed to create reservation.'); }
    finally { setSubmitting(false); }
  };

  const VEHICLE_TYPES = ['car','motorcycle','truck','van','other'];

  return (
    <div className="min-h-screen" style={{ background:'#f8fafc' }}>
      <Navbar/>
      <div>

        {/* Header — extends behind navbar */}
        <div style={{ background:'linear-gradient(135deg,#0f0c29 0%,#1e1b4b 30%,#3730a3 70%,#4f46e5 100%)' }}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
            <Link to={`/parking/${parkingId}`} className="flex items-center gap-1.5 text-indigo-300 text-sm mb-4 hover:text-white transition-colors w-fit">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              Back to parking
            </Link>
            <h1 className="text-2xl font-extrabold text-white mb-1">Reserve a Spot</h1>
            <p className="text-indigo-200 text-sm">{parking?.name} · {parking?.address}</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Vehicle section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3"
                style={{ background:'linear-gradient(to right,#eef2ff,#f5f3ff)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                  style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>1</div>
                <div>
                  <p className="text-sm font-bold text-indigo-700">Vehicle Details</p>
                  <p className="text-xs text-indigo-400">Select or enter your vehicle</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {vehicles.length > 0 && (
                  <div>
                    <label className="label">Select saved vehicle</label>
                    <select className="input" onChange={e => {
                      const v = vehicles.find(x => x.vehicle_number === e.target.value);
                      if (v) setForm(f => ({ ...f, vehicle_number:v.vehicle_number, vehicle_type:v.vehicle_type }));
                    }}>
                      {vehicles.map(v => <option key={v.id} value={v.vehicle_number}>{v.vehicle_number} ({v.vehicle_type})</option>)}
                    </select>
                    <p className="text-xs text-gray-400 mt-1.5">Or enter details manually below</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Plate Number *</label>
                    <input name="vehicle_number" required className="input uppercase font-mono" placeholder="NY-ABC-1234"
                      value={form.vehicle_number} onChange={handle}/>
                  </div>
                  <div>
                    <label className="label">Vehicle Type</label>
                    <select name="vehicle_type" className="input capitalize" value={form.vehicle_type} onChange={handle}>
                      {VEHICLE_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Time section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3"
                style={{ background:'linear-gradient(to right,#eef2ff,#f5f3ff)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                  style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>2</div>
                <div>
                  <p className="text-sm font-bold text-indigo-700">Reservation Time</p>
                  <p className="text-xs text-indigo-400">Select your parking duration</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Check-in *</label>
                    <input type="datetime-local" name="start_time" required className="input"
                      min={toLocalInput(new Date())} value={form.start_time} onChange={handle}/>
                  </div>
                  <div>
                    <label className="label">Check-out *</label>
                    <input type="datetime-local" name="end_time" required className="input"
                      min={form.start_time} value={form.end_time} onChange={handle}/>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100">
                  <svg className="w-5 h-5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth={1.8}/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v6l4 2"/>
                  </svg>
                  <p className="text-sm text-indigo-700">
                    Duration: <strong>{hours} hour{hours!==1?'s':''}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Notes section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3"
                style={{ background:'linear-gradient(to right,#eef2ff,#f5f3ff)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                  style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>3</div>
                <div>
                  <p className="text-sm font-bold text-indigo-700">Special Requests</p>
                  <p className="text-xs text-indigo-400">Optional — any additional info</p>
                </div>
              </div>
              <div className="p-6">
                <textarea name="notes" rows={2} className="input resize-none"
                  placeholder="Any special requests or information for the operator..."
                  value={form.notes} onChange={handle}/>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50"
                style={{ background:'linear-gradient(to right,#eef2ff,#f5f3ff)' }}>
                <p className="text-sm font-bold text-indigo-700">Booking Summary</p>
              </div>
              <div className="p-6 space-y-3">
                {[
                  { label:'Location',     value: parking?.name },
                  { label:'Vehicle',      value: form.vehicle_number || '--' },
                  { label:'Vehicle Type', value: form.vehicle_type ? form.vehicle_type.charAt(0).toUpperCase() + form.vehicle_type.slice(1) : '--' },
                  { label:'Rate',         value: `${formatCurrency(parking?.hourly_rate)}/hr` },
                  { label:'Duration',     value: `${hours} hr${hours!==1?'s':''}` },
                ].map(d => (
                  <div key={d.label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{d.label}</span>
                    <span className="font-semibold text-gray-800">{d.value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-extrabold text-indigo-600">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pb-4">
              <Link to={`/parking/${parkingId}`} className="btn-secondary flex-1 justify-center">Back</Link>
              <button type="submit" disabled={submitting}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)', boxShadow:'0 4px 14px rgba(99,102,241,0.35)' }}>
                {submitting ? 'Confirming...' : 'Confirm Reservation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
