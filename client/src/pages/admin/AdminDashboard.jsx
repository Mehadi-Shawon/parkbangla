import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
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
      style={{ background:`linear-gradient(135deg,${accent}dd,${accent}99)`, boxShadow:`0 8px 24px ${accent}40` }}>
      {/* Decorative circles */}
      <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full bg-white/10 pointer-events-none"/>
      <div className="absolute -bottom-6 -right-2 w-20 h-20 rounded-full bg-white/5 pointer-events-none"/>
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2.5 rounded-xl bg-white/20">
            <span className="text-white"><Icon /></span>
          </div>
          {trend && (
            <span className="flex items-center gap-1 text-[11px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
              <I.TrendUp />{trend}
            </span>
          )}
        </div>
        <p className="text-3xl font-extrabold mb-0.5 text-white">{value}</p>
        <p className="text-sm text-white/75">{label}</p>
        {sub && <p className="text-xs text-white/50 mt-1">{sub}</p>}
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

export default function AdminDashboard() {
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

        <AdminPageHeader
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>}
          label="Overview" title="Dashboard"
          subtitle={new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
          color="#6366f1"
          stats={stats ? [
            { value: stats.users?.total ?? 0,        label: 'Users'       },
            { value: stats.parkings?.total ?? 0,      label: 'Locations'   },
            { value: stats.reservations?.total ?? 0,  label: 'Bookings'    },
            { value: stats.parkings?.pending ?? 0,    label: 'Pending'     },
          ] : []}
          right={
            <button onClick={refresh} disabled={spinning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-indigo-600 disabled:opacity-50 transition-all"
              style={{ background:'rgba(255,255,255,0.8)', border:'1px solid rgba(99,102,241,0.2)' }}>
              <span className={spinning ? 'animate-spin' : ''}><I.Refresh /></span>
              Refresh
            </button>
          }
        />

        {/* Pending banner */}
        {stats?.parkings?.pending > 0 && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
            <span className="text-amber-500 flex-shrink-0"><I.Warning /></span>
            <p className="text-sm text-amber-800 flex-1">
              <strong className="text-amber-700">{stats.parkings.pending}</strong> location{stats.parkings.pending !== 1 ? 's' : ''} waiting for approval
            </p>
            <Link to="/admin/parking" className="flex items-center gap-1 text-xs font-bold text-amber-600 hover:underline">
              Review <I.ChevR />
            </Link>
          </div>
        )}

        {/* KPI cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">{Array(4).fill(0).map((_,i) => <Sk key={i} />)}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
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

          {/* Health panel */}
          <div className="glass rounded-2xl p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">System Health</h2>
              <p className="text-xs text-gray-400 mt-0.5">Platform performance</p>
            </div>
            <div className="space-y-5 flex-1">
              {loading ? Array(3).fill(0).map((_,i) => <div key={i} className="h-10 glass rounded-lg animate-pulse" />) :
                health.map(m => (
                  <div key={m.label}>
                    <div className="flex justify-between mb-2">
                      <span className="text-xs text-gray-500">{m.label}</span>
                      <span className="text-xs font-bold text-gray-800">{m.val}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100">
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width:`${m.val}%`, background:`linear-gradient(90deg,${m.color}90,${m.color})`, boxShadow:`0 0 8px ${m.color}50` }}/>
                    </div>
                  </div>
                ))
              }
            </div>
            {stats && (
              <div className="rounded-xl p-4 space-y-2.5 bg-black/[0.03] border border-black/5">
                {[
                  { l:'Total Users',   v:(stats.users.drivers||0)+(stats.users.owners||0) },
                  { l:'All Locations', v:stats.parkings.total },
                  { l:'All Bookings',  v:stats.reservations.total },
                ].map(r => (
                  <div key={r.l} className="flex justify-between">
                    <span className="text-xs text-gray-400">{r.l}</span>
                    <span className="text-sm font-bold text-gray-800">{r.v}</span>
                  </div>
                ))}
                <div className="pt-2 mt-1 flex justify-between border-t border-black/5">
                  <span className="text-xs text-gray-400">Revenue</span>
                  <span className="text-base font-extrabold text-emerald-600">{formatCurrency(stats.reservations.revenue)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent reservations */}
        <div className="admin-card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Recent Reservations</h2>
              <p className="text-xs text-gray-400 mt-0.5">Latest bookings system-wide</p>
            </div>
            <Link to="/admin/reservations" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
              View all <I.ChevR />
            </Link>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">{Array(4).fill(0).map((_,i) => <div key={i} className="h-10 glass rounded-lg animate-pulse" />)}</div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <p className="text-sm">No reservations yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/5">
                    {['ID','Driver','Location','Vehicle','Date','Amount','Status'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r, i) => (
                    <tr key={r.id} className="border-b border-black/[0.03] last:border-0 hover:bg-black/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                          #{String(r.id).padStart(4,'0')}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                            {(r.driver?.name||'U').charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 leading-tight truncate">{r.driver?.name||''}</p>
                            <p className="text-[10px] text-gray-400 truncate">{r.driver?.email||''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 max-w-[150px]">
                        <p className="text-sm text-gray-600 truncate">{r.parking?.name||''}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-mono text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-lg">{r.vehicle_number}</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-xs text-gray-500">{formatDateTime(r.start_time)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-gray-800">{formatCurrency(r.total_amount)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_DOT[r.status]||'#9ca3af' }}/>
                          <span className="capitalize text-xs text-gray-500">{r.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}


