import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { downloadReceipt } from '../../utils/receiptDownload';

export default function BookingSuccess() {
  const location = useLocation();
  const navigate  = useNavigate();
  const booking   = location.state?.booking;
  const parking   = location.state?.parking;
  const [copied,  setCopied]  = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!booking) { navigate('/dashboard'); return; }
    setTimeout(() => setVisible(true), 50);
  }, [booking]);

  if (!booking) return null;

  const copyId = () => {
    navigator.clipboard.writeText(`#${String(booking.id).padStart(4,'0')}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDirections = () => {
    const addr = parking?.address || booking.parking_address || '';
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank');
  };

  return (
    <div className="min-h-screen pb-20 lg:pb-0 flex flex-col"
      style={{ background:'linear-gradient(160deg,#0f0c29 0%,#1e1b4b 40%,#3730a3 75%,#4f46e5 100%)' }}>
      <Navbar />

      {/* ── Top hero — fills upper screen ── */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center pt-24 pb-8 px-4 relative overflow-hidden">
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize:'28px 28px' }}/>
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-20"
          style={{ background:'radial-gradient(circle,#22c55e,transparent)', filter:'blur(60px)' }}/>

        <div className={`relative flex flex-col items-center text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {/* Success ring */}
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{ background:'#22c55e', transform:'scale(1.4)' }}/>
            <div className="w-16 h-16 rounded-full flex items-center justify-center relative"
              style={{ background:'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow:'0 0 32px rgba(34,197,94,0.5)' }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1">Booking Confirmed!</h1>
          <p className="text-indigo-200/70 text-sm">Your parking spot has been reserved</p>

          {/* Booking ID pill */}
          <div className="mt-4 flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2">
            <span className="text-indigo-200 text-xs font-bold uppercase tracking-widest">ID</span>
            <span className="text-white font-extrabold font-mono text-base">#{String(booking.id).padStart(4,'0')}</span>
            <button onClick={copyId}
              className="text-[11px] font-bold text-white/60 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-0.5 rounded-full transition-all">
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom white card — slides up ── */}
      <div className={`flex-1 bg-white rounded-t-3xl transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        style={{ boxShadow:'0 -8px 40px rgba(0,0,0,0.2)' }}>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-200"/>
        </div>

        {/* Section label */}
        <div className="px-5 pb-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Booking Details</p>
        </div>

        {/* Details — icon list style */}
        <div className="px-5 space-y-2.5 pb-4">

          {/* Location */}
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{parking?.name || booking.parking_name || '--'}</p>
              {(parking?.address || booking.parking_address) && (
                <p className="text-xs text-gray-400 truncate">{parking?.address || booking.parking_address}</p>
              )}
            </div>
          </div>

          {/* Vehicle + Amount row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.5.5M13 16H3"/></svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Vehicle</p>
                <p className="text-sm font-bold text-gray-900 font-mono truncate">{booking.vehicle_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-2xl"
              style={{ background:'linear-gradient(135deg,#eef2ff,#e0e7ff)' }}>
              <div className="w-9 h-9 rounded-xl bg-indigo-200 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1"/></svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wide">Total</p>
                <p className="text-base font-extrabold text-indigo-700">{formatCurrency(booking.total_amount)}</p>
              </div>
            </div>
          </div>

          {/* Check-in / Check-out row */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label:'Check-in', value: formatDateTime(booking.start_time), color:'bg-green-100 text-green-600' },
              { label:'Check-out', value: formatDateTime(booking.end_time), color:'bg-orange-100 text-orange-600' },
            ].map(d => (
              <div key={d.label} className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${d.color}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{d.label}</p>
                  <p className="text-xs font-semibold text-gray-800 leading-snug">{d.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-gray-100 mb-4"/>

        {/* Actions */}
        <div className="px-5 pb-6 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={getDirections}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4"/></svg>
              Directions
            </button>
            <button onClick={() => downloadReceipt(booking, parking)}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Receipt
            </button>
          </div>
          <Link to="/reservations"
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)', boxShadow:'0 4px 14px rgba(99,102,241,0.35)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>
            View My Bookings
          </Link>
          <Link to="/dashboard" className="block text-center text-xs text-gray-400 hover:text-gray-600 py-1">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
