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
      style={{ background:'linear-gradient(160deg,#0f0c29 0%,#1e1b4b 45%,#3730a3 80%,#4f46e5 100%)' }}>
      <Navbar />

      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background:'radial-gradient(circle,#818cf8,transparent)', filter:'blur(80px)' }}/>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full opacity-10"
          style={{ background:'radial-gradient(circle,#22c55e,transparent)', filter:'blur(60px)' }}/>
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize:'28px 28px' }}/>
      </div>

      {/* Centered ticket */}
      <div className="relative flex-1 flex items-center justify-center px-4 pt-20 pb-8">
        <div className={`w-full max-w-sm transition-all duration-700 ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>

          {/* ── Ticket top — gradient header ── */}
          <div className="rounded-t-3xl overflow-hidden"
            style={{ background:'linear-gradient(135deg,#1e1b4b,#3730a3,#4f46e5)' }}>

            {/* Success mark + title */}
            <div className="flex flex-col items-center pt-7 pb-5 px-6">
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                  style={{ background:'#22c55e', transform:'scale(1.5)' }}/>
                <div className="relative w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background:'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow:'0 0 24px rgba(34,197,94,0.5)' }}>
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
              </div>
              <h1 className="text-xl font-extrabold text-white">Booking Confirmed!</h1>
              <p className="text-indigo-200/70 text-sm mt-1">Your parking spot is reserved</p>

              {/* Booking ID */}
              <div className="mt-4 flex items-center gap-2.5 bg-white/10 border border-white/20 rounded-full px-4 py-2">
                <span className="text-indigo-200 text-[11px] font-bold uppercase tracking-widest">ID</span>
                <span className="text-white font-extrabold font-mono">{`#${String(booking.id).padStart(4,'0')}`}</span>
                <button onClick={copyId}
                  className="text-[11px] font-bold text-white/60 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-0.5 rounded-full transition-all">
                  {copied ? '✓' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Perforated divider */}
            <div className="flex items-center px-4 pb-1">
              <div className="flex-1 border-t-2 border-dashed border-white/20"/>
            </div>
          </div>

          {/* ── Ticket bottom — white body ── */}
          <div className="bg-white rounded-b-3xl px-5 pt-5 pb-5"
            style={{ boxShadow:'0 20px 60px rgba(0,0,0,0.4)' }}>

            {/* Detail rows */}
            <div className="space-y-3 mb-5">

              {/* Location */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium">Parking Location</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{parking?.name || booking.parking_name || '--'}</p>
                </div>
              </div>

              {/* Vehicle */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-medium">Vehicle</p>
                  <p className="text-sm font-bold text-gray-900 font-mono">{booking.vehicle_number} <span className="font-sans font-normal text-gray-400 capitalize">· {booking.vehicle_type}</span></p>
                </div>
              </div>

              {/* Times */}
              <div className="flex gap-2">
                {[
                  { label:'Check-in',  value: formatDateTime(booking.start_time), color:'bg-green-50 text-green-600'  },
                  { label:'Check-out', value: formatDateTime(booking.end_time),   color:'bg-orange-50 text-orange-500' },
                ].map(d => (
                  <div key={d.label} className="flex-1 bg-gray-50 rounded-xl p-3">
                    <div className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-1.5 ${d.color}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      {d.label}
                    </div>
                    <p className="text-xs font-semibold text-gray-800 leading-snug">{d.value}</p>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl"
                style={{ background:'linear-gradient(135deg,#1e1b4b,#4338ca)' }}>
                <div>
                  <p className="text-xs text-indigo-300 font-medium">Total Amount</p>
                  <p className="text-[11px] text-indigo-300/60 mt-0.5">Payable on exit</p>
                </div>
                <p className="text-2xl font-extrabold text-white">{formatCurrency(booking.total_amount)}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={getDirections}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4"/></svg>
                  Directions
                </button>
                <button onClick={() => downloadReceipt(booking, parking)}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  Receipt
                </button>
              </div>
              <Link to="/reservations"
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)', boxShadow:'0 4px 14px rgba(99,102,241,0.35)' }}>
                View My Bookings
              </Link>
              <Link to="/dashboard" className="block text-center text-xs text-gray-400 hover:text-gray-600 py-1">
                Back to Dashboard
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
