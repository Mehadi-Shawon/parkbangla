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
    // Trigger entrance animation
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
    <div className="min-h-screen" style={{ background:'linear-gradient(135deg,#f0f4ff 0%,#e8f0fe 100%)' }}>
      <Navbar />
      <div className="pt-24 flex items-center justify-center min-h-screen px-4 py-12">
        <div className={`w-full max-w-md transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

          {/* Success icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-xl"
                style={{ background:'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              {/* Pulse rings */}
              
            </div>
          </div>

          {/* Main card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="px-6 pt-6 pb-4 text-center border-b border-gray-100">
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Booking Confirmed!</h1>
              <p className="text-gray-500 text-sm">Your parking spot has been reserved</p>
            </div>

            {/* Journey Tracker */}
            <div className="px-6 py-4 border-b border-gray-100" style={{ background:'#f8fafc' }}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">Reservation Status</p>
              <div className="flex items-center">
                {[
                  { label:'Pending',   color:'#f59e0b', done: true  },
                  { label:'Confirmed', color:'#3b82f6', done: true, current: true },
                  { label:'Parked',    color:'#22c55e', done: false },
                  { label:'Completed', color:'#8b5cf6', done: false },
                ].map((step, i) => (
                  <div key={step.label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="relative w-8 h-8 rounded-full flex items-center justify-center transition-all"
                        style={{
                          background: step.done ? step.color : '#f1f5f9',
                          border: `2px solid ${step.done ? step.color : '#e2e8f0'}`,
                          boxShadow: step.current ? `0 0 0 4px ${step.color}20` : 'none',
                        }}>
                        {step.done ? (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                          </svg>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-gray-300"/>
                        )}
                      </div>
                      <span className="text-[10px] font-bold mt-1 whitespace-nowrap"
                        style={{ color: step.done ? step.color : '#d1d5db' }}>
                        {step.label}
                      </span>
                    </div>
                    {i < 3 && (
                      <div className="flex-1 h-0.5 mx-1 mb-4 rounded-full"
                        style={{ background: step.done && i < 1 ? step.color : '#e2e8f0' }}/>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Booking ID */}
            <div className="mx-6 my-4 flex items-center justify-between px-4 py-3 rounded-2xl"
              style={{ background:'linear-gradient(135deg,#eef2ff,#f5f3ff)', border:'1px dashed #c7d2fe' }}>
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Booking ID</p>
                <p className="text-xl font-extrabold text-indigo-700 font-mono">
                  #{String(booking.id).padStart(4,'0')}
                </p>
              </div>
              <button onClick={copyId}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 px-3 py-1.5 rounded-xl hover:bg-indigo-50 transition-all">
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    Copy ID
                  </>
                )}
              </button>
            </div>

            {/* Details */}
            <div className="px-6 pb-5 space-y-3">
              {[
                {
                  icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>,
                  label:'Location',
                  value: parking?.name || booking.parking_name || '--',
                  sub: parking?.address || booking.parking_address,
                },
                {
                  icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.5.5M13 16H3"/></svg>,
                  label:'Vehicle',
                  value: booking.vehicle_number,
                  sub: booking.vehicle_type,
                },
                {
                  icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
                  label:'Check-in',
                  value: formatDateTime(booking.start_time),
                },
                {
                  icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
                  label:'Check-out',
                  value: formatDateTime(booking.end_time),
                },
              ].map(d => (
                <div key={d.label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className="text-indigo-500 mt-0.5 flex-shrink-0">{d.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{d.label}</p>
                    <p className="text-sm font-semibold text-gray-800 capitalize">{d.value}</p>
                    {d.sub && <p className="text-xs text-gray-400 capitalize">{d.sub}</p>}
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="flex items-center justify-between p-4 rounded-2xl"
                style={{ background:'linear-gradient(135deg,#1e1b4b,#4338ca)' }}>
                <div>
                  <p className="text-xs font-bold text-indigo-300 uppercase tracking-wide">Total Amount</p>
                  <p className="text-xs text-indigo-300/70 mt-0.5">Payment on exit</p>
                </div>
                <p className="text-2xl font-extrabold text-white">{formatCurrency(booking.total_amount)}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 grid grid-cols-2 gap-2">
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

            <div className="px-6 pb-6">
              <Link to="/reservations"
                className="block w-full text-center py-3 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)', boxShadow:'0 4px 14px rgba(99,102,241,0.35)' }}>
                View My Bookings
              </Link>
              <Link to="/dashboard" className="block text-center text-xs text-gray-400 hover:text-gray-600 mt-3">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
