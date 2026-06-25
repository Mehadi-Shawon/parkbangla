import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import OwnerLayout from '../../components/owner/OwnerLayout';
import { useAuth } from '../../context/AuthContext';
import * as parkingService from '../../services/parkingService';
import * as reservationService from '../../services/reservationService';
import { formatCurrency, formatDateTime, statusColor } from '../../utils/helpers';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';

/* ── Icons ─────────────────────────────────────────────── */
const I = {
  Location: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  Slots:    () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>,
  Ticket:   () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>,
  Revenue:  () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Active:   () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  Plus:     () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>,
  ChevR:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>,
  Car:      () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.5.5M13 16H3m10 0h1m3-10h-3a2 2 0 00-2 2v1h7.5L19 7l-2-1z"/></svg>,
};

/* ── KPI Card ─────────────────────────────────────────── */
function KpiCard({ label, value, sub, icon: Icon, gradient, trend }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl text-white ${gradient}`}
      style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full bg-white/5" />
      {/* Mobile: horizontal · Desktop: stacked */}
      <div className="relative flex items-center gap-3 p-3 lg:flex-col lg:items-start lg:p-5">
        <div className="bg-white/20 w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center flex-shrink-0 lg:mb-2">
          <Icon />
        </div>
        <div className="min-w-0">
          <p className="text-lg lg:text-2xl font-extrabold leading-tight">{value}</p>
          <p className="text-white/75 text-xs lg:text-sm mt-0.5 truncate">{label}</p>
          {sub && <p className="text-white/50 text-xs mt-0.5 hidden lg:block">{sub}</p>}
        </div>
        {trend && (
          <span className="absolute top-2 right-2 bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Quick Slot Row ─────────────────────────────────────── */
function ParkingRow({ p, onUpdated }) {
  const [slots,   setSlots]   = useState(p.available_slots);
  const [saving,  setSaving]  = useState(false);

  const update = async (newVal) => {
    const clamped = Math.max(0, Math.min(p.total_slots, newVal));
    setSlots(clamped);
    setSaving(true);
    try {
      await parkingService.updateAvailability(p.id, clamped);
      onUpdated();
    } catch { setSlots(p.available_slots); }
    finally { setSaving(false); }
  };

  const pct      = p.total_slots > 0 ? (slots / p.total_slots) * 100 : 0;
  const barColor = pct===0 ? 'bg-red-400' : pct<30 ? 'bg-orange-400' : pct<60 ? 'bg-yellow-400' : 'bg-emerald-400';

  return (
    <div className="px-4 sm:px-6 py-3.5 hover:bg-gray-50/70 transition-colors">
      {/* Top row: ring + info + chevron */}
      <div className="flex items-center gap-3">
        <AvailRing available={slots} total={p.total_slots} size={40}/>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
            <span className={`badge text-[10px] flex-shrink-0 ${p.status==='approved' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
              {p.status}
            </span>
          </div>
          <p className="text-xs text-gray-400 truncate mb-1.5">{p.address}</p>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width:`${pct}%` }}/>
          </div>
        </div>
        <Link to={`/owner/parking/${p.id}/edit`}
          className="flex-shrink-0 p-2 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors">
          <I.ChevR />
        </Link>
      </div>

      {/* Bottom row: slot controls — mobile full width, desktop inline */}
      {p.status === 'approved' && (
        <div className="flex items-center gap-2 mt-2.5 pl-[52px]">
          <button onClick={() => update(slots-1)} disabled={slots<=0||saving}
            className="w-7 h-7 rounded-lg border border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-500 font-bold text-base flex items-center justify-center transition-all disabled:opacity-30">
            −
          </button>
          <span className="text-sm font-bold text-gray-900 w-6 text-center">{saving ? '…' : slots}</span>
          <button onClick={() => update(slots+1)} disabled={slots>=p.total_slots||saving}
            className="w-7 h-7 rounded-lg border border-gray-200 text-gray-500 hover:bg-green-50 hover:border-green-200 hover:text-green-600 font-bold text-base flex items-center justify-center transition-all disabled:opacity-30">
            +
          </button>
          <span className="text-xs text-gray-400">of {p.total_slots} slots</span>
        </div>
      )}
    </div>
  );
}

/* ── Availability Ring ─────────────────────────────────── */
function AvailRing({ available, total, size = 44 }) {
  const pct  = total > 0 ? available / total : 0;
  const r    = 16;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const color = pct === 0 ? '#ef4444' : pct < 0.3 ? '#f97316' : '#22c55e';
  return (
    <svg width={size} height={size} viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 22 22)" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x="22" y="26" textAnchor="middle" fontSize="9" fontWeight="bold" fill={color}>
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

/* ── Chart Tooltip ─────────────────────────────────────── */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-lg text-sm">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="font-bold text-indigo-600">{payload[0].value} bookings</p>
    </div>
  );
};

/* ── Main ──────────────────────────────────────────────── */
export default function OwnerDashboard() {
  const { user }    = useAuth();
  const [stats,     setStats]     = useState(null);
  const [parkings,  setParkings]  = useState([]);
  const [recent,    setRecent]    = useState([]);
  const [chart,     setChart]     = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [s, p] = await Promise.all([
        parkingService.getOwnerStats(user.id),
        parkingService.getOwnerParkings(user.id),
      ]);
      setStats(s);
      setParkings(p);

      const ids = p.map(x => x.id);
      if (ids.length) {
        const { data: res } = await reservationService.getOwnerReservations({ parkingIds: ids, limit: 5 });
        setRecent(res);

        // 7-day chart
        const today    = new Date(); today.setHours(0,0,0,0);
        const sevenAgo = new Date(today); sevenAgo.setDate(sevenAgo.getDate() - 6);
        const { data: chartData } = await supabase
          .from('reservations')
          .select('created_at')
          .in('parking_id', ids)
          .gte('created_at', sevenAgo.toISOString());
        const map = {};
        for (let i = 0; i < 7; i++) {
          const d = new Date(sevenAgo); d.setDate(d.getDate() + i);
          map[d.toISOString().slice(0,10)] = 0;
        }
        (chartData || []).forEach(r => { const k = r.created_at.slice(0,10); if (map[k] !== undefined) map[k]++; });
        setChart(Object.entries(map).map(([date, count]) => ({ date: date.slice(5), count })));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const kpis = stats ? [
    { label: 'Parking Locations', value: stats.total_locations,     icon: I.Location, gradient: 'bg-gradient-to-br from-indigo-500 to-indigo-700', sub: 'Active properties' },
    { label: 'Available Slots',   value: stats.available_slots,     icon: I.Slots,    gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-700', sub: `of ${stats.total_slots} total` },
    { label: 'Active Bookings',   value: stats.active_reservations, icon: I.Active,   gradient: 'bg-gradient-to-br from-amber-500 to-orange-600',    sub: 'Vehicles parked now' },
    { label: 'Total Revenue',     value: formatCurrency(stats.total_revenue), icon: I.Revenue, gradient: 'bg-gradient-to-br from-violet-500 to-purple-700', trend: '+8%' },
  ] : [];

  return (
    <OwnerLayout
      title="Dashboard"
      subtitle="Here's how your parking properties are performing today."
      action={
        <Link to="/owner/parking/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white border border-white/25 hover:bg-white/10 transition-all"
          style={{ background:'rgba(255,255,255,0.12)' }}>
          <I.Plus /> Add Parking
        </Link>
      }>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">

          {/* ── KPI Cards ── */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 sm:mb-8">
              {Array(4).fill(0).map((_,i) => <div key={i} className="h-16 lg:h-32 rounded-2xl bg-gray-200 animate-pulse"/>)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 sm:mb-8">
              {kpis.map(k => <KpiCard key={k.label} {...k} />)}
            </div>
          )}

          {/* ── Main content ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* ── Left: Chart + Parking list ── */}
            <div className="xl:col-span-2 space-y-5">

              {/* Chart */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Booking Activity</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Reservations across all your locations</p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">Last 7 days</span>
                </div>
                {chart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={chart} margin={{ top:4, right:4, left:-28, bottom:0 }}>
                      <defs>
                        <linearGradient id="ownerGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.25}/>
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                      <XAxis dataKey="date" tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                      <Tooltip content={<ChartTip />} cursor={{ stroke:'#e0e7ff', strokeWidth:1 }}/>
                      <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fill="url(#ownerGrad)"
                        dot={{ r:3.5, fill:'#6366f1', strokeWidth:2, stroke:'#fff' }}
                        activeDot={{ r:5, fill:'#4f46e5', strokeWidth:2, stroke:'#fff' }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-44 flex items-center justify-center text-gray-300 text-sm">No reservation data yet</div>
                )}
              </div>

              {/* Parking locations */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                  <h2 className="text-base font-bold text-gray-900">My Parking Locations</h2>
                  <Link to="/owner/parking" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
                    Manage all <I.ChevR />
                  </Link>
                </div>
                {parkings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                      <I.Location />
                    </div>
                    <p className="text-gray-400 text-sm">No parking locations yet</p>
                    <Link to="/owner/parking/new" className="btn-primary text-sm">Add First Location</Link>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {parkings.slice(0,5).map(p => (
                      <ParkingRow key={p.id} p={p} onUpdated={() => {
                        setParkings(prev => prev.map(x => x.id===p.id ? { ...x } : x));
                      }}/>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Recent bookings + Quick actions ── */}
            <div className="space-y-5">

              {/* Quick actions */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-base font-bold text-gray-900 mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  {[
                    {
                      to: '/owner/parking/new', label: 'Add New Parking',
                      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>,
                      bg: 'bg-indigo-50 text-indigo-600',
                    },
                    {
                      to: '/owner/parking', label: 'Manage Locations',
                      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
                      bg: 'bg-blue-50 text-blue-600',
                    },
                    {
                      to: '/owner/reservations', label: 'View All Reservations',
                      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>,
                      bg: 'bg-emerald-50 text-emerald-600',
                    },
                    {
                      to: '/profile', label: 'Account Settings',
                      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
                      bg: 'bg-slate-100 text-slate-600',
                    },
                  ].map(a => (
                    <Link key={a.to} to={a.to}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.bg}`}>{a.icon}</span>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors flex-1">{a.label}</span>
                      <I.ChevR />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Recent reservations */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                  <h2 className="text-base font-bold text-gray-900">Recent Bookings</h2>
                  <Link to="/owner/reservations" className="text-xs font-semibold text-indigo-600 hover:underline">View all →</Link>
                </div>
                {recent.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <I.Ticket />
                    <p className="text-sm mt-2">No reservations yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {recent.map(r => (
                      <div key={r.id} className="px-5 py-3.5 hover:bg-gray-50/70 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-semibold text-gray-800 truncate">{r.parking?.name}</p>
                            </div>
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <I.Car />
                              {r.vehicle_number} · {r.driver?.name}
                            </p>
                            <p className="text-xs text-gray-300 mt-0.5">{formatDateTime(r.start_time)}</p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <span className={`badge text-xs ${statusColor(r.status)}`}>{r.status}</span>
                            <p className="text-sm font-bold text-gray-800 mt-1">{formatCurrency(r.total_amount)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
      </div>
    </OwnerLayout>
  );
}
