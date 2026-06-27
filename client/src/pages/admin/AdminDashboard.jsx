import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import * as adminService from '../../services/adminService';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

/* ???????? Icons ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
const I = {
  Users:   () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  Build:   () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>,
  Ticket:  () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>,
  Dollar:  () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Refresh: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
  Warning: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
  ChevR:   () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>,
  TrendUp: () => <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>,
};

/* ── KPI Card — colored gradient ─────────────────────────── */
function KpiCard({ label, value, sub, icon: Icon, accent, trend }) {
  return (
    <div className="relative overflow-hidden rounded-2xl text-white"
      style={{ background:`linear-gradient(135deg,${accent},${accent}cc)`, boxShadow:`0 8px 28px ${accent}60` }}>
      {/* Dark depth overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background:'linear-gradient(135deg,rgba(0,0,0,0.15),rgba(0,0,0,0.05))' }}/>
      {/* Decorative circles */}
      <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full bg-white/10 pointer-events-none"/>
      <div className="absolute -bottom-6 -right-2 w-20 h-20 rounded-full bg-white/5 pointer-events-none"/>
      <div className="relative p-4 sm:p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-white/20">
            <span className="text-white"><Icon /></span>
          </div>
          {trend && (
            <span className="flex items-center gap-1 text-[10px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full">
              <I.TrendUp />{trend}
            </span>
          )}
        </div>
        <p className="text-2xl sm:text-3xl font-extrabold mb-0.5 text-white">{value}</p>
        <p className="text-xs sm:text-sm text-white/75">{label}</p>
        {sub && <p className="text-xs text-white/50 mt-0.5 hidden sm:block">{sub}</p>}
      </div>
    </div>
  );
}

/* ???????? Chart Tooltip ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="font-bold text-gray-900">{payload[0].value} bookings</p>
    </div>
  );
};

const STATUS_DOT = { confirmed:'#60a5fa', active:'#34d399', completed:'#9ca3af', cancelled:'#f87171', pending:'#fbbf24' };

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function AdminDashboard() {
  const { user }   = useAuth();
  const [stats,    setStats]    = useState(null);
  const [recent,   setRecent]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [spinning, setSpinning] = useState(false);

  const load = async () => {
    try {
      const [s, r] = await Promise.all([adminService.getStats(), adminService.getAllReservations({ limit: 6 })]);
      setStats(s); setRecent(r.data);
    } finally { setLoading(false); setSpinning(false); }
  };

  useEffect(() => { load(); }, []);
  const refresh = () => { setSpinning(true); load(); };

  const kpis = stats ? [
    { label: 'Total Drivers',       value: stats.users.drivers,     icon: I.Users,   accent: '#3b82f6', sub: `${stats.users.owners} parking owners`, trend: '+12%' },
    { label: 'Approved Locations',  value: stats.parkings.approved, icon: I.Build,   accent: '#22c55e', sub: `${stats.parkings.pending} pending` },
    { label: 'Active Reservations', value: stats.reservations.active, icon: I.Ticket, accent: '#f59e0b', sub: `${stats.reservations.total} total` },
    { label: 'Total Revenue',       value: formatCurrency(stats.reservations.revenue), icon: I.Dollar, accent: '#8b5cf6', trend: '+8%' },
  ] : [];

  const health = stats ? [
    { label: 'Approval Rate',   val: stats.parkings.total > 0 ? Math.round((stats.parkings.approved/stats.parkings.total)*100) : 0, color: '#22c55e' },
    { label: 'Booking Rate',    val: Math.min(Math.round((stats.reservations.total/Math.max(stats.users.drivers,1))*25), 100),        color: '#3b82f6' },
    { label: 'Active Sessions', val: stats.reservations.total > 0 ? Math.round((stats.reservations.active/stats.reservations.total)*100) : 0, color: '#8b5cf6' },
  ] : [];

  const Sk = () => <div className="glass rounded-2xl animate-pulse" style={{ height: 120 }} />;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">

        {/* ── Dashboard hero header ── */}
        <div className="relative rounded-2xl overflow-hidden mb-7"
          style={{ boxShadow:'0 8px 32px rgba(0,0,0,0.08)' }}>
          {/* Background */}
          <div className="absolute inset-0"
            style={{ background:'linear-gradient(135deg,#0a0818 0%,#0f0c29 40%,#1e1b4b 70%,#312e81 100%)' }}/>
          {/* Orbs */}
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full pointer-events-none"
            style={{ background:'radial-gradient(circle,rgba(99,102,241,0.25),transparent 70%)', filter:'blur(20px)' }}/>
          <div className="absolute bottom-0 left-1/4 w-40 h-40 rounded-full pointer-events-none"
            style={{ background:'radial-gradient(circle,rgba(139,92,246,0.15),transparent 70%)', filter:'blur(30px)' }}/>
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{ backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize:'24px 24px' }}/>

          <div className="relative px-4 sm:px-6 py-4 sm:py-7">
            {/* Top row */}
            <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium mb-1" style={{ color:'rgba(165,180,252,0.6)' }}>
                  {greeting()}, <span className="text-white font-bold">{user?.name?.split(' ')[0] || 'Admin'}</span>
                </p>
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-white leading-tight">Platform Overview</h1>
                <p className="text-xs sm:text-sm mt-0.5 hidden sm:block" style={{ color:'rgba(255,255,255,0.35)' }}>
                  {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {stats && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.25)', color:'#4ade80' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
                    Online
                  </div>
                )}
                <button onClick={refresh} disabled={spinning}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 transition-all"
                  style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.7)' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.14)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}>
                  <span className={spinning ? 'animate-spin' : ''}><I.Refresh /></span>
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* Stat chips — hidden on mobile (KPI cards show same data), flex on desktop */}
            {stats && (
              <div className="hidden sm:flex gap-2">
                {[
                  { value: stats.users?.total ?? 0,               label:'Users',     color:'#818cf8' },
                  { value: stats.parkings?.total ?? 0,             label:'Locations', color:'#34d399' },
                  { value: stats.reservations?.total ?? 0,         label:'Bookings',  color:'#60a5fa' },
                  { value: formatCurrency(stats.reservations?.revenue ?? 0), label:'Revenue', color:'#a78bfa' },
                  { value: stats.parkings?.pending ?? 0,           label:'Pending',   color:'#fbbf24' },
                ].map((s,i) => (
                  <div key={i} className="flex flex-col items-center px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl"
                    style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)' }}>
                    <p className="text-sm sm:text-base font-extrabold leading-none" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[9px] sm:text-[10px] font-medium mt-1 whitespace-nowrap" style={{ color:'rgba(255,255,255,0.35)' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Pending action card ── */}
        {stats?.parkings?.pending > 0 && (
          <div className="mb-6 rounded-2xl overflow-hidden"
            style={{ background:'linear-gradient(135deg,#fffbeb,#fef3c7)', border:'1px solid #fde68a' }}>
            <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow:'0 4px 12px rgba(245,158,11,0.4)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-900">
                  {stats.parkings.pending} parking location{stats.parkings.pending !== 1 ? 's' : ''} awaiting approval
                </p>
                <p className="text-xs text-amber-700/70 mt-0.5">Review and approve or reject submitted locations</p>
              </div>
              <Link to="/admin/parking"
                className="flex-shrink-0 flex items-center gap-1 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 whitespace-nowrap"
                style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow:'0 2px 8px rgba(245,158,11,0.4)' }}>
                <span className="hidden sm:inline">Review Now</span>
                <span className="sm:hidden">Review</span>
                <I.ChevR />
              </Link>
            </div>
          </div>
        )}

        {/* KPI cards */}
        {loading ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">{Array(4).fill(0).map((_,i) => <div key={i} className="h-28 sm:h-32 rounded-2xl bg-gray-100 animate-pulse"/>)}</div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
            {kpis.map(k => <KpiCard key={k.label} {...k} />)}
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-5">

          {/* Area chart */}
          <div className="xl:col-span-2 glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-gray-900">Booking Trend</h2>
                <p className="text-xs text-gray-400 mt-0.5">Reservations over the last 7 days</p>
              </div>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">7 days</span>
            </div>
            {stats?.chart?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={stats.chart} margin={{ top:4, right:4, left:-28, bottom:0 }}>
                  <defs>
                    <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" vertical={false}/>
                  <XAxis dataKey="date" tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip content={<ChartTip />} cursor={{ stroke:'rgba(99,102,241,0.1)', strokeWidth:1 }}/>
                  <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fill="url(#aGrad)"
                    dot={{ r:3.5, fill:'#6366f1', strokeWidth:2, stroke:'#fff' }}
                    activeDot={{ r:5, fill:'#4f46e5', strokeWidth:2, stroke:'#fff' }}/>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data for this period</div>
            )}
          </div>

          {/* System Health — redesigned */}
          <div className="admin-card rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">System Health</h2>
                <p className="text-xs text-gray-400 mt-0.5">Platform performance</p>
              </div>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              </div>
            </div>

            {/* Progress metrics */}
            <div className="space-y-4">
              {loading ? Array(3).fill(0).map((_,i) => <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse"/>) :
                health.map(m => (
                  <div key={m.label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-semibold text-gray-600">{m.label}</span>
                      <span className="text-xs font-extrabold" style={{ color: m.color }}>{m.val}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width:`${m.val}%`, background:`linear-gradient(90deg,${m.color}80,${m.color})`, boxShadow:`0 0 10px ${m.color}40` }}/>
                    </div>
                  </div>
                ))
              }
            </div>

            {/* Key numbers */}
            {stats && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  { label:'Total Users',  value:(stats.users.drivers||0)+(stats.users.owners||0), color:'#6366f1', bg:'#eef2ff' },
                  { label:'Locations',    value:stats.parkings.total,   color:'#22c55e', bg:'#f0fdf4' },
                  { label:'Bookings',     value:stats.reservations.total, color:'#3b82f6', bg:'#eff6ff' },
                  { label:'Revenue',      value:formatCurrency(stats.reservations.revenue), color:'#8b5cf6', bg:'#f5f3ff' },
                ].map(r => (
                  <div key={r.label} className="rounded-xl p-3 text-center"
                    style={{ background: r.bg }}>
                    <p className="text-base font-extrabold leading-none" style={{ color: r.color }}>{r.value}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-1">{r.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent reservations */}
        <div className="admin-card rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Recent Reservations</h2>
                <p className="text-xs text-gray-400">Latest bookings system-wide</p>
              </div>
            </div>
            <Link to="/admin/reservations"
              className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
              style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
              View all <I.ChevR />
            </Link>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">{Array(4).fill(0).map((_,i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse"/>)}</div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>
              </div>
              <p className="text-sm text-gray-400">No reservations yet</p>
            </div>
          ) : (
            <>
            {/* Mobile cards */}
            <div className="md:hidden p-3 space-y-2.5">
              {recent.map(r => {
                const statusConf = {
                  confirmed:{ bg:'#eff6ff',color:'#2563eb',dot:'#3b82f6' },
                  active:   { bg:'#f0fdf4',color:'#16a34a',dot:'#22c55e' },
                  completed:{ bg:'#f9fafb',color:'#6b7280',dot:'#9ca3af' },
                  cancelled:{ bg:'#fef2f2',color:'#dc2626',dot:'#ef4444' },
                  pending:  { bg:'#fffbeb',color:'#d97706',dot:'#f59e0b' },
                }[r.status] || { bg:'#f9fafb',color:'#6b7280',dot:'#9ca3af' };
                return (
                  <div key={`m-${r.id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                          #{String(r.id).padStart(4,'0')}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                          style={{ background: statusConf.bg, color: statusConf.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusConf.dot }}/>
                          {r.status}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(r.total_amount)}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                        {(r.driver?.name||'U').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{r.driver?.name||'—'}</p>
                        <p className="text-xs text-gray-400 truncate">{r.parking?.name||'—'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg border border-gray-200">{r.vehicle_number}</span>
                        {r.vehicle_type && <p className="text-[10px] text-gray-400 capitalize mt-0.5 text-right">{r.vehicle_type}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full" style={{ minWidth:'760px' }}>
                <thead>
                  <tr>
                    {['Booking','Driver','Location','Vehicle','Type','Date','Amount','Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                        style={{ color:'#6366f1', background:'#f5f7ff', borderBottom:'2px solid #e0e7ff' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recent.map(r => {
                    const statusConf = {
                      confirmed: { bg:'#eff6ff', color:'#2563eb', dot:'#3b82f6' },
                      active:    { bg:'#f0fdf4', color:'#16a34a', dot:'#22c55e' },
                      completed: { bg:'#f9fafb', color:'#6b7280', dot:'#9ca3af' },
                      cancelled: { bg:'#fef2f2', color:'#dc2626', dot:'#ef4444' },
                      pending:   { bg:'#fffbeb', color:'#d97706', dot:'#f59e0b' },
                    }[r.status] || { bg:'#f9fafb', color:'#6b7280', dot:'#9ca3af' };

                    return (
                      <tr key={r.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                            #{String(r.id).padStart(4,'0')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                              {(r.driver?.name||'U').charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate max-w-[110px]">{r.driver?.name||'—'}</p>
                              <p className="text-[10px] text-gray-400 truncate max-w-[110px]">{r.driver?.email||''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm text-gray-700 font-medium truncate max-w-[130px]">{r.parking?.name||'—'}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg border border-gray-200">{r.vehicle_number}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full capitalize">{r.vehicle_type || '—'}</span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="text-xs text-gray-500">{formatDateTime(r.start_time)}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(r.total_amount)}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
                            style={{ background: statusConf.bg, color: statusConf.color }}>
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusConf.dot }}/>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}


