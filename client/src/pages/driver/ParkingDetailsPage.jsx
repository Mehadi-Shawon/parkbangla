import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import MapComponent from '../../components/common/MapComponent';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import * as parkingService from '../../services/parkingService';
import { formatCurrency, availabilityColor } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function ParkingDetailsPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [parking, setParking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parkingService.getById(id)
      .then(setParking)
      .catch(() => toast.error('Parking not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;

  if (!parking) return (
    <div className="min-h-screen pb-20 lg:pb-0 flex flex-col"><Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-4">Parking location not found.</p>
          <Link to="/search" className="btn-primary">Back to Search</Link>
        </div>
      </div>
      <Footer/>
    </div>
  );

  const amenities = Array.isArray(parking.amenities) ? parking.amenities : JSON.parse(parking.amenities||'[]');
  const pct       = parking.total_slots > 0 ? (parking.available_slots/parking.total_slots)*100 : 0;
  const isFull    = parking.available_slots === 0;
  const owner     = parking.owner || {};

  const barColor = pct===0 ? '#ef4444' : pct<30 ? '#f97316' : pct<60 ? '#eab308' : '#22c55e';
  const barLabel = pct===0 ? 'Full' : pct<30 ? 'Critical' : pct<60 ? 'Low' : 'Available';

  return (
    <div className="min-h-screen pb-20 lg:pb-0 flex flex-col" style={{ background:'#f8fafc' }}>
      <Navbar />
      <div className="flex-1">

        {/* Hero — extends behind navbar */}
        <div style={{ background:'linear-gradient(135deg,#0f0c29 0%,#1e1b4b 30%,#3730a3 70%,#4f46e5 100%)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
            <Link to="/search" className="flex items-center gap-1.5 text-indigo-300 text-sm mb-4 hover:text-white transition-colors w-fit">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              Back to search
            </Link>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white mb-1">{parking.name}</h1>
                <p className="text-indigo-200 text-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                  {parking.address}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold text-white">{formatCurrency(parking.hourly_rate)}</p>
                <p className="text-indigo-300 text-sm">per hour</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left column */}
            <div className="lg:col-span-2 space-y-5">

              {/* Map */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <MapComponent parkings={[parking]}
                  center={{ lat: parseFloat(parking.latitude), lng: parseFloat(parking.longitude) }}
                  zoom={16} height="300px"/>
              </div>

              {/* Availability */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-gray-900">Slot Availability</h2>
                  <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background:`${barColor}15`, color:barColor, border:`1px solid ${barColor}30` }}>
                    {barLabel}
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background:barColor }}/>
                </div>
                <p className="text-sm text-gray-500">
                  <span className="font-bold text-gray-900" style={{ color:barColor }}>{parking.available_slots}</span>
                  {' '}of {parking.total_slots} slots available
                </p>
              </div>

              {/* Details grid */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4">Location Details</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label:'Total Slots',  value: parking.total_slots },
                    { label:'Available',    value: parking.available_slots },
                    { label:'Hourly Rate',  value: formatCurrency(parking.hourly_rate) },
                    { label:'Opens',        value: parking.opening_time?.slice(0,5) || '00:00' },
                    { label:'Closes',       value: parking.closing_time?.slice(0,5) || '23:59' },
                    { label:'Owner',        value: owner.name || '--' },
                  ].map(d => (
                    <div key={d.label} className="bg-gray-50 rounded-xl px-4 py-3">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{d.label}</p>
                      <p className="text-sm font-bold text-gray-800">{d.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              {parking.description && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-base font-bold text-gray-900 mb-2">About</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">{parking.description}</p>
                </div>
              )}

              {/* Amenities */}
              {amenities.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-base font-bold text-gray-900 mb-4">Amenities</h2>
                  <div className="flex flex-wrap gap-2">
                    {amenities.map(a => (
                      <span key={a} className="flex items-center gap-1.5 text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-xl">
                        <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Booking card */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg sticky top-24 p-6">
                <div className="text-center mb-5 pb-5 border-b border-gray-100">
                  <p className="text-4xl font-extrabold text-indigo-600">{formatCurrency(parking.hourly_rate)}</p>
                  <p className="text-sm text-gray-400 mt-1">per hour</p>
                </div>

                <div className="space-y-3 mb-5">
                  {[
                    { label:'Availability', value: isFull ? 'Fully Booked' : `${parking.available_slots} slots free`, color: isFull ? 'text-red-600' : 'text-green-600' },
                    { label:'Total capacity', value: `${parking.total_slots} slots` },
                    { label:'Hours', value: `${parking.opening_time?.slice(0,5)||'00:00'} – ${parking.closing_time?.slice(0,5)||'23:59'}` },
                  ].map(d => (
                    <div key={d.label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{d.label}</span>
                      <span className={`font-semibold ${d.color||'text-gray-800'}`}>{d.value}</span>
                    </div>
                  ))}
                </div>

                {user?.role === 'driver' ? (
                  <button
                    onClick={() => !isFull && navigate(`/reserve/${parking.id}`)}
                    disabled={isFull}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: isFull ? '#e2e8f0' : 'linear-gradient(135deg,#6366f1,#2563eb)', boxShadow: isFull ? 'none' : '0 4px 14px rgba(99,102,241,0.35)', color: isFull ? '#94a3b8' : '#fff' }}>
                    {isFull ? 'No Slots Available' : 'Reserve a Spot'}
                  </button>
                ) : !user ? (
                  <Link to="/login" state={{ from:{ pathname:`/parking/${parking.id}` } }}
                    className="block w-full text-center py-3 rounded-xl text-sm font-bold text-white"
                    style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)', boxShadow:'0 4px 14px rgba(99,102,241,0.35)' }}>
                    Sign in to Reserve
                  </Link>
                ) : null}

                <p className="text-center text-xs text-gray-400 mt-3">Free cancellation up to 1 hour before</p>

                {owner.phone && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">Contact Owner</p>
                    <p className="text-sm font-semibold text-gray-700">{owner.phone}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer/>
    </div>
  );
}
