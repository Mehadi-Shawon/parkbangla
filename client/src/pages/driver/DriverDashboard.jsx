import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DriverLayout from '../../components/driver/DriverLayout';
import { useAuth } from '../../context/AuthContext';
import * as reservationService from '../../services/reservationService';
import { formatCurrency, formatDateTime, statusColor, timeAgo } from '../../utils/helpers';

/* ── Icons ─────────────────────────────────────────────── */
const I = {
  Search:  () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
  Ticket:  () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>,
  Check:   () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Dollar:  () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1"/></svg>,
  Car:     () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.5.5M13 16H3m10 0h1m3-10h-3a2 2 0 00-2 2v1h7.5L19 7l-2-1z"/></svg>,
  Map:     () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  ChevR:   () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>,
  Clock:   () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={1.8}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v6l4 2"/></svg>,
};

/* ── Status pill ────────────────────────────────────────── */
const StatusPill = ({ status }) => {
  const map = {
    pending:   'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    active:    'bg-green-50 text-green-700 border-green-200',
    completed: 'bg-gray-100 text-gray-600 border-gray-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
  };
  return (
    <span className={`capitalize text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${map[status] || map.pending}`}>
      {status}
    </span>
  );
};

export default function DriverDashboard() {
  const { user } = useAuth();
  const [recent, setRecent] = useState([]);
  const [stats,  setStats]  = useState({ total:0, active:0, completed:0, spent:0 });
  const [loading,setLoading]= useState(true);

  useEffect(() => {
    reservationService.getMyReservations({ limit: 5 }).then(({ data, total }) => {
      setRecent(data);
      setStats({
        total,
        active:    data.filter(x => x.status === 'active').length,
        completed: data.filter(x => x.status === 'completed').length,
        spent:     data.filter(x => x.status !== 'cancelled').reduce((s,x) => s + parseFloat(x.total_amount||0), 0),
      });
    }).finally(() => setLoading(false));
  }, []);

  const kpis = [
    { label:'Total Bookings', value: stats.total,     icon: I.Ticket, color:'#3b82f6', bg:'#eff6ff' },
    { label:'Active Now',     value: stats.active,    icon: I.Car,    color:'#22c55e', bg:'#f0fdf4' },
    { label:'Completed',      value: stats.completed, icon: I.Check,  color:'#8b5cf6', bg:'#f5f3ff' },
    { label:'Total Spent',    value: formatCurrency(stats.spent), icon: I.Dollar, color:'#f59e0b', bg:'#fffbeb' },
  ];

  const quickActions = [
    { to:'/search',       label:'Find Parking',       sub:'Search available spots near you',  icon: I.Search, color:'#3b82f6', bg:'#eff6ff' },
    { to:'/reservations', label:'My Reservations',    sub:'View and manage your bookings',     icon: I.Ticket, color:'#6366f1', bg:'#eef2ff' },
    { to:'/profile',      label:'My Vehicles',        sub:'Manage your registered vehicles',   icon: I.Car,    color:'#22c55e', bg:'#f0fdf4' },
  ];

  return (
    <DriverLayout
      title="Dashboard"
      subtitle="Ready to find your next parking spot?"
      action={
        <Link to="/search"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white border border-white/25 hover:bg-white/10 transition-all"
          style={{ background:'rgba(255,255,255,0.12)' }}>
          <I.Search />
          Find Parking
        </Link>
      }>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* KPI cards */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {Array(4).fill(0).map((_,i) => <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse"/>)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {kpis.map(k => (
                <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 flex-shrink-0"
                    style={{ background:k.bg }}>
                    <span style={{ color:k.color }}><k.icon /></span>
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900">{k.value}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Recent reservations */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Recent Reservations</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Your latest parking bookings</p>
                  </div>
                  <Link to="/reservations" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
                    View all <I.ChevR />
                  </Link>
                </div>

                {loading ? (
                  <div className="p-6 space-y-3">
                    {Array(3).fill(0).map((_,i) => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse"/>)}
                  </div>
                ) : recent.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                      <svg className="w-7 h-7 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-700">No reservations yet</p>
                      <p className="text-xs text-gray-400 mt-1">Your bookings will appear here</p>
                    </div>
                    <Link to="/search" className="btn-primary text-sm mt-1">Find Parking Now</Link>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {recent.map(r => (
                      <div key={r.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/70 transition-colors">
                        {/* Status color bar */}
                        <div className="w-1 h-10 rounded-full flex-shrink-0" style={{
                          background: r.status==='active' ? '#22c55e' : r.status==='confirmed' ? '#3b82f6' : r.status==='cancelled' ? '#ef4444' : '#d1d5db'
                        }}/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-gray-900 truncate">{r.parking?.name}</p>
                            <StatusPill status={r.status}/>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><I.Car/>{r.vehicle_number}</span>
                            <span className="flex items-center gap-1"><I.Clock/>{timeAgo(r.start_time)}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(r.total_amount)}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">#{String(r.id).padStart(4,'0')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Quick actions */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-base font-bold text-gray-900 mb-4">Quick Actions</h2>
                <div className="space-y-2.5">
                  {quickActions.map(a => (
                    <Link key={a.to} to={a.to}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background:a.bg, color:a.color }}>
                        <a.icon />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">{a.label}</p>
                        <p className="text-xs text-gray-400 truncate">{a.sub}</p>
                      </div>
                      <I.ChevR />
                    </Link>
                  ))}
                </div>
              </div>

              {/* CTA card */}
              <div className="rounded-2xl p-5 text-white overflow-hidden relative"
                style={{ background:'linear-gradient(135deg,#4f46e5,#2563eb)', boxShadow:'0 8px 24px rgba(79,70,229,0.3)' }}>
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10"/>
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                    <I.Map />
                  </div>
                  <p className="font-bold text-base mb-1">Find a Spot Now</p>
                  <p className="text-indigo-200 text-xs mb-3">Browse hundreds of locations with live availability.</p>
                  <Link to="/search"
                    className="inline-flex items-center gap-2 text-xs font-bold bg-white text-indigo-700 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors">
                    Search Parking <I.ChevR />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
    </DriverLayout>
  );
}
