import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { downloadReceipt } from '../../utils/receiptDownload';
import * as reservationService from '../../services/reservationService';
import toast from 'react-hot-toast';

/* ── Timer hook ─────────────────────────────────────────── */
function useTimer(targetDate, mode = 'countdown') {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const diff = mode === 'countdown'
        ? new Date(targetDate) - Date.now()
        : Date.now() - new Date(targetDate);
      setElapsed(Math.max(0, diff));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate, mode]);
  return elapsed;
}

function formatMs(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/* ── Step config ────────────────────────────────────────── */
const STEPS = [
  {
    key: 'confirmed',
    label: 'Confirmed',
    sub: 'Your spot is reserved',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    ),
  },
  {
    key: 'active',
    label: 'Parked',
    sub: 'Vehicle has entered',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.5.5M13 16H3"/>
      </svg>
    ),
  },
  {
    key: 'completed',
    label: 'Completed',
    sub: 'Session finished',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
      </svg>
    ),
  },
];

const STATUS_ORDER = { pending:0, confirmed:0, active:1, completed:2, cancelled:-1 };

export default function ReservationStatus() {
  const { id }      = useParams();
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [res,       setRes]     = useState(null);
  const [loading,   setLoading] = useState(true);
  const [confirm,   setConfirm] = useState(null);

  /* ── Fetch reservation ── */
  const load = async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select('*, parking:parking_locations(id,name,address,latitude,longitude,hourly_rate,owner:users!parking_locations_owner_id_fkey(name,phone))')
      .eq('id', id)
      .single();
    if (error || !data) { navigate('/reservations'); return; }
    if (data.user_id !== user?.id) { navigate('/reservations'); return; }
    setRes(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  /* ── Real-time subscription ── */
  useEffect(() => {
    const channel = supabase
      .channel(`reservation-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'reservations',
        filter: `id=eq.${id}`,
      }, (payload) => {
        setRes(prev => ({ ...prev, ...payload.new }));
        const newStatus = payload.new.status;
        if (newStatus === 'active')    toast.success('Vehicle entry confirmed! You\'re now parked.', { icon:'🚗', duration:5000 });
        if (newStatus === 'completed') toast.success('Session complete! Thanks for using ParkBangla.', { icon:'✅', duration:5000 });
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [id]);

  /* ── Timers ── */
  const timeUntilStart = useTimer(res?.start_time, 'countdown');
  const timeParked     = useTimer(res?.entry_time,  'elapsed');
  const timeUntilEnd   = useTimer(res?.end_time,    'countdown');

  const handleCancel = () => {
    setConfirm({
      title:        'Cancel Reservation?',
      message:      'This will free the slot. This action cannot be undone.',
      confirmLabel: 'Cancel Booking',
      danger:       true,
      onConfirm:    async () => {
        await reservationService.cancel(parseInt(id));
        toast.success('Reservation cancelled.');
        navigate('/reservations');
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20 lg:pb-0" style={{ background:'#f8fafc' }}>
        <Navbar/>
        <div className="pt-16 flex items-center justify-center min-h-[80vh]">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/>
        </div>
      </div>
    );
  }

  if (!res) return null;

  const stepIndex   = STATUS_ORDER[res.status] ?? 0;
  const isCancelled = res.status === 'cancelled';
  const parking     = res.parking;

  /* ── Hero gradient by status ── */
  const heroGrad = isCancelled
    ? 'linear-gradient(135deg,#7f1d1d,#991b1b)'
    : res.status === 'active'
    ? 'linear-gradient(135deg,#064e3b,#065f46)'
    : res.status === 'completed'
    ? 'linear-gradient(135deg,#1e1b4b,#3730a3)'
    : 'linear-gradient(135deg,#1e3a5f,#1d4ed8)';

  return (
    <div className="min-h-screen" style={{ background:'#f8fafc' }}>
      <Navbar/>
      <div>

        {/* Hero — extends behind navbar */}
        <div className="relative overflow-hidden" style={{ background: heroGrad }}>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5"/>
          </div>
          <div className="relative max-w-2xl mx-auto px-4 pt-24 pb-8">
            <Link to="/reservations" className="flex items-center gap-1.5 text-white/60 text-sm mb-4 hover:text-white transition-colors w-fit">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              My Reservations
            </Link>

            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">
                  Reservation #{String(res.id).padStart(4,'0')}
                </p>
                <h1 className="text-2xl font-extrabold text-white">{parking?.name}</h1>
                <p className="text-white/60 text-sm mt-0.5">{parking?.address}</p>
              </div>
              <span className={`text-sm font-bold px-4 py-1.5 rounded-full flex-shrink-0 capitalize ${
                res.status==='active'    ? 'bg-green-500/20 text-green-200 border border-green-400/30' :
                res.status==='completed' ? 'bg-white/15 text-white/80 border border-white/20' :
                res.status==='cancelled' ? 'bg-red-500/20 text-red-200 border border-red-400/30' :
                'bg-blue-500/20 text-blue-200 border border-blue-400/30'
              }`}>
                {res.status}
              </span>
            </div>

            {/* Live timer */}
            {res.status === 'confirmed' && (
              <div className="mt-5 bg-white/10 border border-white/15 rounded-2xl px-5 py-4 flex items-center gap-4">
                <svg className="w-8 h-8 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth={1.8}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v6l4 2"/>
                </svg>
                <div>
                  <p className="text-white/60 text-xs mb-0.5">Check-in starts in</p>
                  <p className="text-2xl font-extrabold text-white font-mono">{formatMs(timeUntilStart)}</p>
                </div>
              </div>
            )}

            {res.status === 'active' && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="bg-white/10 border border-white/15 rounded-2xl px-4 py-3">
                  <p className="text-white/60 text-xs mb-0.5">Time parked</p>
                  <p className="text-xl font-extrabold text-white font-mono">{formatMs(timeParked)}</p>
                </div>
                <div className="bg-white/10 border border-white/15 rounded-2xl px-4 py-3">
                  <p className="text-white/60 text-xs mb-0.5">Time remaining</p>
                  <p className={`text-xl font-extrabold font-mono ${timeUntilEnd < 900000 ? 'text-red-300' : 'text-white'}`}>
                    {timeUntilEnd > 0 ? formatMs(timeUntilEnd) : 'Overdue'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

          {/* Status stepper */}
          {!isCancelled && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-5">Status Progress</p>
              <div className="flex items-start gap-0">
                {STEPS.map((step, i) => {
                  const done    = i < stepIndex;
                  const current = i === stepIndex;
                  const future  = i > stepIndex;
                  return (
                    <div key={step.key} className="flex-1 flex flex-col items-center relative">
                      {/* Connector line */}
                      {i < STEPS.length - 1 && (
                        <div className="absolute top-5 left-1/2 right-0 h-0.5 z-0" style={{
                          background: done ? '#6366f1' : '#e2e8f0'
                        }}/>
                      )}

                      {/* Circle */}
                      <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center mb-2 border-2 transition-all ${
                        done    ? 'bg-indigo-600 border-indigo-600 text-white' :
                        current ? 'bg-white border-indigo-600 text-indigo-600 shadow-lg shadow-indigo-200' :
                                  'bg-white border-gray-200 text-gray-300'
                      }`}>
                        {done ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                          </svg>
                        ) : (
                          <div className={`${current ? 'scale-100' : 'scale-75 opacity-50'} transition-all`}>
                            {step.icon}
                          </div>
                        )}
                      </div>

                      <p className={`text-xs font-bold text-center ${current ? 'text-indigo-700' : done ? 'text-gray-700' : 'text-gray-300'}`}>
                        {step.label}
                      </p>
                      <p className={`text-[10px] text-center mt-0.5 ${current ? 'text-indigo-400' : 'text-gray-300'}`}>
                        {step.sub}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cancelled notice */}
          {isCancelled && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </div>
              <div>
                <p className="font-bold text-red-700">Reservation Cancelled</p>
                <p className="text-sm text-red-500 mt-0.5">This booking has been cancelled. The slot has been freed.</p>
              </div>
            </div>
          )}

          {/* Booking details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Booking Details</p>
            <div className="space-y-3">
              {[
                { label:'Vehicle',        value: res.vehicle_number, sub: res.vehicle_type },
                { label:'Check-in time',  value: formatDateTime(res.start_time) },
                { label:'Check-out time', value: formatDateTime(res.end_time) },
                ...(res.entry_time ? [{ label:'Entered at',   value: formatDateTime(res.entry_time) }] : []),
                ...(res.exit_time  ? [{ label:'Exited at',    value: formatDateTime(res.exit_time) }] : []),
                { label:'Total Amount',   value: formatCurrency(res.total_amount), bold: true },
              ].map(d => (
                <div key={d.label} className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">{d.label}</span>
                  <div className="text-right">
                    <span className={`text-sm capitalize ${d.bold ? 'font-extrabold text-indigo-700 text-base' : 'font-semibold text-gray-800'}`}>
                      {d.value}
                    </span>
                    {d.sub && <p className="text-xs text-gray-400 capitalize">{d.sub}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Owner contact */}
          {parking?.owner?.phone && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Need help? Contact the owner</p>
                <p className="text-sm font-bold text-gray-800">{parking.owner.name}</p>
                <p className="text-sm text-indigo-600">{parking.owner.phone}</p>
              </div>
              <a href={`tel:${parking.owner.phone}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                </svg>
                Call
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            {res.status === 'completed' && (
              <button onClick={() => downloadReceipt(res, parking)}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Download Receipt
              </button>
            )}

            {['pending','confirmed'].includes(res.status) && (
              <button onClick={handleCancel}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                Cancel Booking
              </button>
            )}

            <Link to="/search"
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200 transition-all col-span-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              Find More Parking
            </Link>
          </div>

          <Link to="/reservations" className="block text-center text-sm text-gray-400 hover:text-gray-600 pb-4">
            View all reservations
          </Link>
        </div>
      </div>

      <ConfirmDialog config={confirm} onClose={() => setConfirm(null)}/>
    </div>
  );
}
