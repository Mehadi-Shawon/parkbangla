import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/helpers';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const RANGES = [
  { label: '7d',  days: 7  },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 shadow-xl text-sm"
      style={{ background:'rgba(15,12,41,0.92)', border:'1px solid rgba(255,255,255,0.1)', backdropFilter:'blur(16px)' }}>
      <p className="text-white/50 text-xs mb-1.5">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="text-xs font-bold" style={{ color: p.color }}>
          {p.name}: {p.name === 'Revenue' ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

const KPI_CONFIG = [
  { label:'Total Revenue',   key:'revenue',   accent:'#6366f1', icon:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1"/>, fmt: v => formatCurrency(v) },
  { label:'Total Bookings',  key:'bookings',  accent:'#3b82f6', icon:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>, fmt: v => v },
  { label:'Completed',       key:'completed', accent:'#22c55e', icon:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>, fmt: v => v },
  { label:'Avg per Booking', key:'avgRate',   accent:'#f59e0b', icon:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>, fmt: v => formatCurrency(v) },
];

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
      const { data: res } = await supabase
        .from('reservations')
        .select('status, total_amount, created_at, parking:parking_locations(id,name,owner_id,owner:users!parking_locations_owner_id_fkey(name))')
        .gte('created_at', since);

      const completed = (res||[]).filter(r => ['active','completed'].includes(r.status));
      const map = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        map[d.toISOString().slice(0,10)] = { date: d.toLocaleDateString('en-US',{month:'short',day:'numeric'}), Revenue: 0, Bookings: 0 };
      }
      (res||[]).forEach(r => {
        const k = r.created_at.slice(0,10);
        if (map[k]) { map[k].Bookings++; if (['active','completed'].includes(r.status)) map[k].Revenue += parseFloat(r.total_amount||0); }
      });
      setRevenueChart(Object.values(map));

      const locMap = {};
      completed.forEach(r => {
        const id = r.parking?.id, name = r.parking?.name || 'Unknown';
        if (!locMap[id]) locMap[id] = { name: name.length > 16 ? name.slice(0,14)+'…' : name, revenue:0, bookings:0 };
        locMap[id].revenue += parseFloat(r.total_amount||0); locMap[id].bookings++;
      });
      setByLocation(Object.values(locMap).sort((a,b)=>b.revenue-a.revenue).slice(0,8));

      const ownerMap = {};
      completed.forEach(r => {
        const oid = r.parking?.owner_id, name = r.parking?.owner?.name || 'Unknown';
        if (!ownerMap[oid]) ownerMap[oid] = { name, revenue:0, bookings:0 };
        ownerMap[oid].revenue += parseFloat(r.total_amount||0); ownerMap[oid].bookings++;
      });
      setByOwner(Object.values(ownerMap).sort((a,b)=>b.revenue-a.revenue));

      const totalRev = completed.reduce((s,r)=>s+parseFloat(r.total_amount||0),0);
      setTotals({ revenue:totalRev, bookings:(res||[]).length, completed:completed.length, avgRate:completed.length>0?totalRev/completed.length:0 });
    } finally { setLoading(false); }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">

        <AdminPageHeader
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}
          label="Admin" title="Revenue Analytics"
          subtitle="Platform-wide financial performance"
          color="#6366f1"
          right={
            <div className="flex gap-1 p-1 rounded-full" style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)' }}>
              {RANGES.map(r => (
                <button key={r.days} onClick={() => setRange(r.days)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={range===r.days
                    ? { background:'rgba(255,255,255,0.2)', color:'#fff' }
                    : { color:'rgba(255,255,255,0.5)' }}>
                  {r.label}
                </button>
              ))}
            </div>
          }
        />

        {/* KPI cards — gradient */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {KPI_CONFIG.map(c => (
            <div key={c.label} className="relative overflow-hidden rounded-2xl text-white"
              style={{ background:`linear-gradient(135deg,${c.accent},${c.accent}cc)`, boxShadow:`0 8px 28px ${c.accent}50` }}>
              <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full bg-white/10 pointer-events-none"/>
              <div className="absolute -bottom-5 -right-2 w-16 h-16 rounded-full bg-white/5 pointer-events-none"/>
              <div className="absolute inset-0 bg-black/10 pointer-events-none"/>
              <div className="relative p-4 sm:p-5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">{c.icon}</svg>
                </div>
                {loading
                  ? <div className="h-7 w-20 bg-white/20 rounded animate-pulse mb-1"/>
                  : <p className="text-xl sm:text-2xl font-extrabold text-white">{c.fmt(totals[c.key])}</p>}
                <p className="text-xs text-white/70 mt-0.5">{c.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main chart */}
        <div className="rounded-2xl mb-6 overflow-hidden"
          style={{ background:'#fff', border:'1px solid rgba(99,102,241,0.12)', boxShadow:'0 4px 20px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Revenue & Bookings</h2>
              <p className="text-xs text-gray-400 mt-0.5">Last {range} days trend</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-gray-500"><span className="w-3 h-0.5 rounded-full bg-indigo-500 inline-block"/>Revenue</span>
              <span className="flex items-center gap-1.5 text-gray-500"><span className="w-3 h-0.5 rounded-full bg-blue-400 inline-block"/>Bookings</span>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {loading ? <div className="h-52 bg-gray-50 rounded-xl animate-pulse"/> : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueChart} margin={{ top:4, right:4, left:-10, bottom:0 }}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25}/>
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gBook" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.06)" vertical={false}/>
                  <XAxis dataKey="date" tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
                  <YAxis yAxisId="rev" tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
                  <YAxis yAxisId="book" orientation="right" tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Area yAxisId="rev" type="monotone" dataKey="Revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#gRev)" dot={false} activeDot={{ r:4, fill:'#6366f1', stroke:'#fff', strokeWidth:2 }}/>
                  <Area yAxisId="book" type="monotone" dataKey="Bookings" stroke="#3b82f6" strokeWidth={2} fill="url(#gBook)" dot={false} activeDot={{ r:4, fill:'#3b82f6', stroke:'#fff', strokeWidth:2 }}/>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Revenue by location */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background:'#fff', border:'1px solid rgba(99,102,241,0.12)', boxShadow:'0 4px 20px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Revenue by Location</h2>
                <p className="text-xs text-gray-400">Top performing parking lots</p>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {loading ? <div className="h-48 bg-gray-50 rounded-xl animate-pulse"/> : byLocation.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byLocation} layout="vertical" margin={{ top:0, right:10, left:0, bottom:0 }}>
                    <XAxis type="number" tick={{ fontSize:10, fill:'#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
                    <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:'#6b7280' }} axisLine={false} tickLine={false} width={85}/>
                    <Tooltip formatter={v=>formatCurrency(v)} contentStyle={{ borderRadius:12, fontSize:12, border:'none', boxShadow:'0 8px 24px rgba(0,0,0,0.12)' }}/>
                    <Bar dataKey="revenue" radius={[0,8,8,0]} barSize={14} name="Revenue">
                      {byLocation.map((_, i) => (
                        <rect key={i} fill={`rgba(99,102,241,${1 - i * 0.1})`}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Owner leaderboard */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background:'#fff', border:'1px solid rgba(99,102,241,0.12)', boxShadow:'0 4px 20px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Owner Leaderboard</h2>
                <p className="text-xs text-gray-400">Ranked by total revenue</p>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {loading ? (
                <div className="space-y-3">{Array(5).fill(0).map((_,i)=><div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse"/>)}</div>
              ) : byOwner.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {byOwner.slice(0,8).map((o,i) => {
                    const maxRev = byOwner[0].revenue || 1;
                    const pct = (o.revenue / maxRev) * 100;
                    const podium = ['🥇','🥈','🥉'];
                    const barColors = ['#6366f1','#8b5cf6','#3b82f6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899'];
                    return (
                      <div key={o.name} className="flex items-center gap-3 group">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                          style={{ background: i < 3 ? `${barColors[i]}15` : '#f9fafb', color: barColors[i] }}>
                          {i < 3 ? podium[i] : `${i+1}`}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-gray-800 truncate">{o.name}</span>
                            <span className="text-xs font-extrabold ml-2 flex-shrink-0" style={{ color: barColors[i] }}>{formatCurrency(o.revenue)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width:`${pct}%`, background:`linear-gradient(90deg,${barColors[i]}80,${barColors[i]})` }}/>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 w-10 text-right">{o.bookings} bkgs</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
