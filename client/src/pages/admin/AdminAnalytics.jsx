import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/helpers';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const RANGES = [
  { label: '7 days',  days: 7  },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-lg text-sm">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="font-bold" style={{ color: p.color }}>
          {p.name}: {p.name === 'Revenue' ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function AdminAnalytics() {
  const [range,        setRange]        = useState(30);
  const [revenueChart, setRevenueChart] = useState([]);
  const [byLocation,   setByLocation]   = useState([]);
  const [byOwner,      setByOwner]      = useState([]);
  const [totals,       setTotals]       = useState({ revenue:0, bookings:0, avgRate:0, completed:0 });
  const [loading,      setLoading]      = useState(true);

  useEffect(() => { load(range); }, [range]);

  const load = async (days) => {
    setLoading(true);
    try {
      const since = new Date(Date.now() - days * 86400000).toISOString();

      // All reservations in range
      const { data: res } = await supabase
        .from('reservations')
        .select('status, total_amount, created_at, parking:parking_locations(id,name,owner_id,owner:users!parking_locations_owner_id_fkey(name))')
        .gte('created_at', since);

      const completed = (res||[]).filter(r => ['active','completed'].includes(r.status));

      // Daily revenue chart
      const map = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        map[d.toISOString().slice(0,10)] = { date: d.toLocaleDateString('en-US',{month:'short',day:'numeric'}), Revenue: 0, Bookings: 0 };
      }
      (res||[]).forEach(r => {
        const k = r.created_at.slice(0,10);
        if (map[k]) {
          map[k].Bookings++;
          if (['active','completed'].includes(r.status)) map[k].Revenue += parseFloat(r.total_amount || 0);
        }
      });
      setRevenueChart(Object.values(map));

      // By location (top 8)
      const locMap = {};
      completed.forEach(r => {
        const id = r.parking?.id;
        const name = r.parking?.name || 'Unknown';
        if (!locMap[id]) locMap[id] = { name: name.length > 16 ? name.slice(0,14)+'...' : name, revenue: 0, bookings: 0 };
        locMap[id].revenue += parseFloat(r.total_amount || 0);
        locMap[id].bookings++;
      });
      setByLocation(Object.values(locMap).sort((a,b) => b.revenue - a.revenue).slice(0,8));

      // By owner leaderboard
      const ownerMap = {};
      completed.forEach(r => {
        const oid = r.parking?.owner_id;
        const name = r.parking?.owner?.name || 'Unknown';
        if (!ownerMap[oid]) ownerMap[oid] = { name, revenue: 0, bookings: 0 };
        ownerMap[oid].revenue += parseFloat(r.total_amount || 0);
        ownerMap[oid].bookings++;
      });
      const ownerList = Object.values(ownerMap).sort((a,b) => b.revenue - a.revenue);
      setByOwner(ownerList);

      const totalRev = completed.reduce((s,r) => s + parseFloat(r.total_amount||0), 0);
      setTotals({
        revenue:   totalRev,
        bookings:  (res||[]).length,
        completed: completed.length,
        avgRate:   completed.length > 0 ? totalRev / completed.length : 0,
      });
    } finally { setLoading(false); }
  };

  const statCards = [
    { label: 'Total Revenue',   value: formatCurrency(totals.revenue),   color: '#6366f1', bg: '#eef2ff' },
    { label: 'Total Bookings',  value: totals.bookings,                  color: '#3b82f6', bg: '#eff6ff' },
    { label: 'Completed',       value: totals.completed,                 color: '#22c55e', bg: '#f0fdf4' },
    { label: 'Avg per Booking', value: formatCurrency(totals.avgRate),   color: '#f59e0b', bg: '#fffbeb' },
  ];

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        <AdminPageHeader
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}
          label="Admin" title="Revenue Analytics"
          subtitle="Platform-wide financial performance"
          color="#6366f1"
          right={
            <div className="flex gap-1.5">
              {RANGES.map(r => (
                <button key={r.days} onClick={() => setRange(r.days)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${range===r.days ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-200'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          }
        />

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map(c => (
            <div key={c.label} className="admin-card rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: c.bg }}>
                <svg className="w-5 h-5" style={{ color: c.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1"/>
                </svg>
              </div>
              {loading ? <div className="h-7 w-24 bg-gray-100 rounded animate-pulse mb-1"/> : <p className="text-2xl font-extrabold text-gray-900">{c.value}</p>}
              <p className="text-sm text-gray-400">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Revenue + Bookings chart */}
        <div className="admin-card rounded-2xl p-6 mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-5">Revenue & Bookings Over Time</h2>
          {loading ? <div className="h-56 bg-gray-50 rounded-xl animate-pulse"/> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueChart} margin={{ top:4, right:4, left:-10, bottom:0 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gBook" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                <XAxis dataKey="date" tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="rev" tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`}/>
                <YAxis yAxisId="book" orientation="right" tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip />}/>
                <Legend wrapperStyle={{ fontSize:11 }}/>
                <Area yAxisId="rev" type="monotone" dataKey="Revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#gRev)" dot={false}/>
                <Area yAxisId="book" type="monotone" dataKey="Bookings" stroke="#3b82f6" strokeWidth={2} fill="url(#gBook)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by location */}
          <div className="admin-card rounded-2xl p-6">
            <h2 className="text-base font-bold text-gray-900 mb-5">Revenue by Location</h2>
            {loading ? <div className="h-48 bg-gray-50 rounded-xl animate-pulse"/> : byLocation.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byLocation} layout="vertical" margin={{ top:0, right:10, left:0, bottom:0 }}>
                  <XAxis type="number" tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
                  <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:'#6b7280' }} axisLine={false} tickLine={false} width={90}/>
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius:12, fontSize:12 }}/>
                  <Bar dataKey="revenue" fill="#6366f1" radius={[0,6,6,0]} barSize={14} name="Revenue"/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Revenue by owner leaderboard */}
          <div className="admin-card rounded-2xl p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Revenue by Owner</h2>
            {loading ? (
              <div className="space-y-3">{Array(5).fill(0).map((_,i)=><div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse"/>)}</div>
            ) : byOwner.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No data yet</p>
            ) : (
              <div className="space-y-3">
                {byOwner.slice(0,8).map((o, i) => {
                  const maxRev = byOwner[0].revenue || 1;
                  const pct = (o.revenue / maxRev) * 100;
                  const medals = ['🥇','🥈','🥉'];
                  return (
                    <div key={o.name} className="flex items-center gap-3">
                      <span className="text-sm w-5 flex-shrink-0 text-center">{medals[i] || `#${i+1}`}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-800 truncate">{o.name}</span>
                          <span className="text-xs font-bold text-indigo-600 flex-shrink-0 ml-2">{formatCurrency(o.revenue)}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400" style={{ width:`${pct}%` }}/>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{o.bookings}bkgs</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
