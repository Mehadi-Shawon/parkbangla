import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import * as activityService from '../../services/activityService';
import { ACTION_META, CATEGORIES } from '../../services/activityService';
import { formatDateTime, timeAgo, getInitials } from '../../utils/helpers';

/* ???????? Action icon map ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
const ActionIcon = ({ action }) => {
  const icons = {
    'reservation.created':   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>,
    'reservation.cancelled': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>,
    'reservation.entry':     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14"/></svg>,
    'reservation.exit':      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>,
    'parking.created':       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5"/></svg>,
    'parking.approved':      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    'parking.rejected':      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    'parking.deleted':       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
    'manager.assigned':      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>,
    'manager.removed':       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zm7-6l5 5m0-5l-5 5"/></svg>,
    'user.activated':        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
    'user.deactivated':      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>,
  };
  return icons[action] || <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2}/></svg>;
};

/* ???????? Build description from action + meta ???????????????????????????????????????????????????????????????????? */
const describe = (log) => {
  const m   = ACTION_META[log.action];
  const meta = log.meta || {};

  const bold = (t) => <span className="font-semibold text-gray-800">{t}</span>;

  switch (log.action) {
    case 'reservation.created':   return <>{bold(log.actor?.name)} created a reservation for {bold(meta.vehicle_number)} at {bold(meta.parking_name)}</>;
    case 'reservation.cancelled': return <>{bold(log.actor?.name)} cancelled reservation #{bold(log.entity_id)} ({bold(meta.vehicle_number)})</>;
    case 'reservation.entry':     return <>{bold(log.actor?.name)} marked {bold(meta.vehicle_number)} as entered at {bold(meta.parking_name)}</>;
    case 'reservation.exit':      return <>{bold(log.actor?.name)} marked {bold(meta.vehicle_number)} as exited from {bold(meta.parking_name)}</>;
    case 'parking.created':       return <>{bold(log.actor?.name)} added a new parking location: {bold(meta.parking_name)}</>;
    case 'parking.updated':       return <>{bold(log.actor?.name)} updated {bold(meta.parking_name)}</>;
    case 'parking.approved':      return <>{bold(log.actor?.name)} approved {bold(meta.parking_name)}</>;
    case 'parking.rejected':      return <>{bold(log.actor?.name)} rejected {bold(meta.parking_name)}</>;
    case 'parking.deleted':       return <>{bold(log.actor?.name)} deleted parking location {bold(meta.parking_name)}</>;
    case 'manager.assigned':      return <>{bold(log.actor?.name)} assigned {bold(meta.manager_name)} as manager of {bold(meta.parking_name)}</>;
    case 'manager.removed':       return <>{bold(log.actor?.name)} removed manager from {bold(meta.parking_name)}</>;
    case 'user.activated':        return <>{bold(log.actor?.name)} activated account for {bold(meta.target_name || 'a user')}</>;
    case 'user.deactivated':      return <>{bold(log.actor?.name)} deactivated account for {bold(meta.target_name || 'a user')}</>;
    default:                      return <>{bold(log.actor?.name)} performed {log.action}</>;
  }
};

/* ???????? Role badge ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
const RoleBadge = ({ role }) => {
  const styles = {
    admin:   'bg-violet-50 text-violet-700 border-violet-100',
    owner:   'bg-blue-50 text-blue-700 border-blue-100',
    driver:  'bg-gray-100 text-gray-600 border-gray-200',
    manager: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${styles[role] || styles.driver}`}>
      {role}
    </span>
  );
};

/* ???????? Skeleton row ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
const Sk = () => (
  <div className="flex gap-4 py-4">
    <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse flex-shrink-0"/>
    <div className="flex-1 space-y-2 pt-1">
      <div className="h-3.5 bg-gray-100 rounded animate-pulse w-3/4"/>
      <div className="h-3 bg-gray-50 rounded animate-pulse w-1/3"/>
    </div>
  </div>
);

/* ???????? Main ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
export default function AdminActivityLog() {
  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [category, setCategory] = useState('');
  const [auto,     setAuto]     = useState(true);
  const timerRef = useRef(null);
  const LIMIT = 30;

  const load = async (p = 1, cat = category) => {
    setLoading(true);
    try {
      const { data, total: t } = await activityService.getActivity({ category: cat, page: p, limit: LIMIT });
      setLogs(data); setTotal(t); setPage(p);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Auto-refresh every 15 seconds when enabled
  useEffect(() => {
    if (!auto) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => load(1, category), 15000);
    return () => clearInterval(timerRef.current);
  }, [auto, category]);

  const handleCategory = (cat) => { setCategory(cat); load(1, cat); };

  // Group logs by date
  const grouped = logs.reduce((acc, log) => {
    const date = new Date(log.created_at).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">

        {/* Header */}
        <AdminPageHeader
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>}
          label="Admin" title="Activity Log"
          subtitle={`${total} events recorded`}
          color="#10b981"
          right={<div className="flex items-center gap-2">
            <button onClick={() => setAuto(a => !a)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                auto ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${auto ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}/>
              <span className="hidden sm:inline">{auto ? 'Live' : 'Paused'}</span>
            </button>
            <button onClick={() => load(1, category)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:text-indigo-600 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>}
        />

        {/* Category filter — segmented */}
        <div className="flex gap-1 p-1.5 bg-gray-100 rounded-full mb-6">
          {CATEGORIES.map(c => (
            <button key={c.key} onClick={() => handleCategory(c.key)}
              className={`flex-1 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all text-center ${
                category === c.key ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              style={category === c.key ? { background:'linear-gradient(135deg,#10b981,#059669)' } : {}}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="px-6 divide-y divide-gray-50">
              {Array(8).fill(0).map((_, i) => <Sk key={i}/>)}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <p className="text-sm text-gray-400">No activity recorded yet</p>
            </div>
          ) : (
            <div>
              {Object.entries(grouped).map(([date, entries]) => (
                <div key={date}>
                  {/* Date separator */}
                  <div className="sticky top-0 z-10 flex items-center gap-3 px-4 sm:px-6 py-2.5 bg-gray-50/90 backdrop-blur-sm border-y border-gray-100">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{date}</span>
                    <span className="text-[11px] text-gray-300 bg-gray-100 px-2 py-0.5 rounded-full">{entries.length}</span>
                  </div>

                  {/* Events */}
                  <div className="divide-y divide-gray-50">
                    {entries.map(entry => {
                      const meta = ACTION_META[entry.action] || { color:'#6b7280', bg:'#f9fafb' };
                      return (
                        <div key={entry.id} className="flex gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 hover:bg-gray-50/60 transition-colors group">

                          {/* Action icon */}
                          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ background: meta.bg, color: meta.color, border: `1.5px solid ${meta.color}20` }}>
                            <ActionIcon action={entry.action}/>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {describe(entry)}
                            </p>

                            {/* Actor + time row */}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {entry.actor && (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-4 h-4 rounded-full text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0"
                                      style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                                      {getInitials(entry.actor.name)}
                                    </div>
                                    <span className="text-xs text-gray-400">{entry.actor.name}</span>
                                  </div>
                                  <RoleBadge role={entry.actor.role}/>
                                  <span className="text-gray-200">·</span>
                                </>
                              )}
                              <span className="text-xs text-gray-400" title={formatDateTime(entry.created_at)}>
                                {timeAgo(entry.created_at)}
                              </span>
                            </div>
                          </div>

                          {/* Action color dot on right */}
                          <div className="flex-shrink-0 mt-2">
                            <div className="w-1.5 h-1.5 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"
                              style={{ background: meta.color }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > LIMIT && (
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400">
                Showing {(page-1)*LIMIT+1}????{Math.min(page*LIMIT, total)} of {total} events
              </p>
              <div className="flex gap-2">
                <button onClick={() => load(page-1)} disabled={page===1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-white disabled:opacity-30 transition-all">Prev</button>
                <button onClick={() => load(page+1)} disabled={page>=Math.ceil(total/LIMIT)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-white disabled:opacity-30 transition-all">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}



