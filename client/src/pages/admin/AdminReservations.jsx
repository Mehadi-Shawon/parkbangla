import { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import * as adminService from "../../services/adminService";
import { formatDateTime, formatCurrency } from "../../utils/helpers";
import { downloadCSV, RESERVATION_COLUMNS } from "../../utils/csvExport";
import toast from "react-hot-toast";

const STATUSES = ["","pending","confirmed","active","completed","cancelled"];
const DATE_PRESETS = [
  { label:"Today",   days:0  },
  { label:"7 days",  days:7  },
  { label:"30 days", days:30 },
  { label:"All",     days:-1 },
];
const LIMIT = 15;
const DOT = { confirmed:"#60a5fa", active:"#34d399", completed:"#9ca3af", cancelled:"#f87171", pending:"#fbbf24" };

export default function AdminReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState("");
  const [datePreset,   setDatePreset]   = useState(-1);
  const [fromDate,     setFromDate]     = useState("");
  const [toDate,       setToDate]       = useState("");
  const [page,         setPage]         = useState(1);
  const [total,        setTotal]        = useState(0);

  const buildDateFilter = (preset) => {
    if (preset === -1) return { from:"", to:"" };
    if (preset === 0) {
      const t = new Date(); t.setHours(0,0,0,0);
      const t2 = new Date(t); t2.setDate(t2.getDate()+1);
      return { from: t.toISOString(), to: t2.toISOString() };
    }
    const from = new Date(Date.now() - preset*86400000).toISOString();
    return { from, to:"" };
  };

  const load = async (p=1, status=filter, preset=datePreset, from=fromDate, to=toDate) => {
    setLoading(true);
    try {
      const df = buildDateFilter(preset);
      const { data, total: t } = await adminService.getAllReservations({
        status, page:p, limit:LIMIT,
        fromDate: from || df.from,
        toDate:   to   || df.to,
      });
      setReservations(data); setTotal(t); setPage(p);
    } catch { toast.error("Failed to load."); }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleFilter  = s => { setFilter(s); load(1, s); };
  const handlePreset  = d => { setDatePreset(d); setFromDate(""); setToDate(""); load(1, filter, d, "", ""); };
  const handleCustom  = () => { setDatePreset(-2); load(1, filter, -2, fromDate, toDate); };

  const exportCSV = () => downloadCSV(reservations, RESERVATION_COLUMNS, `reservations-${new Date().toISOString().slice(0,10)}.csv`);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <AdminPageHeader
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>}
          label="Management" title="Reservations"
          subtitle="All bookings across every parking location"
          color="#f59e0b"
          stats={[
            { value: total, label: 'Total' },
            { value: reservations.filter(r => r.status === 'active').length,    label: 'Active'    },
            { value: reservations.filter(r => r.status === 'pending').length,   label: 'Pending'   },
            { value: reservations.filter(r => r.status === 'completed').length, label: 'Completed' },
          ]}
          right={
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90" style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export CSV
            </button>
          }
        />

        {/* Date range filter */}
        <div className="admin-card rounded-xl px-4 sm:px-5 py-3 mb-5 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <div className="flex gap-1.5 flex-wrap">
              {DATE_PRESETS.map(dp => (
                <button key={dp.days} onClick={() => handlePreset(dp.days)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${datePreset===dp.days ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-500 border-gray-200 hover:border-indigo-200"}`}>
                  {dp.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
            <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="input text-xs py-1.5 flex-1 sm:w-36 sm:flex-none"/>
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="input text-xs py-1.5 flex-1 sm:w-36 sm:flex-none"/>
            <button onClick={handleCustom} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white">Apply</button>
          </div>
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5 mb-6 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => handleFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${filter===s ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-500 border-gray-200 hover:border-indigo-200"}`}>
              {s ? s.charAt(0).toUpperCase()+s.slice(1) : "All"}
            </button>
          ))}
        </div>

        <div className="admin-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth:'820px' }}>
              <thead>
                <tr className="border-b border-gray-100">
                  {["ID","Driver","Location","Vehicle","Period","Amount","Status"].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-indigo-200 whitespace-nowrap" style={{ background:'linear-gradient(135deg,#1e1b4b,#312e81)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array(8).fill(0).map((_,i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-8 rounded-lg animate-pulse bg-gray-50"/></td></tr>
                )) : reservations.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-16 text-gray-400 text-sm">No reservations found.</td></tr>
                ) : reservations.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-indigo-50/30 transition-colors"
                    style={{ borderLeft:`3px solid ${r.status==='active'?'#22c55e':r.status==='confirmed'?'#3b82f6':r.status==='pending'?'#f59e0b':r.status==='cancelled'?'#ef4444':'#9ca3af'}` }}>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">#{String(r.id).padStart(4,"0")}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background:"linear-gradient(135deg,#6366f1,#2563eb)" }}>{(r.driver?.name||"U").charAt(0)}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate max-w-[130px]">{r.driver?.name||"--"}</p>
                          <p className="text-[10px] text-gray-400 truncate max-w-[130px]">{r.driver?.email||""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-gray-600 truncate max-w-[140px]">{r.parking?.name||"--"}</p>
                    </td>
                    {/* Vehicle + Type merged */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-mono text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-lg">{r.vehicle_number}</span>
                      <p className="text-[11px] text-gray-400 capitalize mt-0.5">{r.vehicle_type||''}</p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="text-xs text-gray-500">{formatDateTime(r.start_time)}</p>
                      <p className="text-[10px] text-gray-300">→ {formatDateTime(r.end_time)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-bold text-gray-800">{formatCurrency(r.total_amount)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:DOT[r.status]||"#9ca3af" }}/>
                        <span className="capitalize text-xs text-gray-500">{r.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {total > LIMIT && (
          <div className="flex items-center justify-between px-2 mt-6">
            <p className="text-xs text-gray-400">Showing {(page-1)*LIMIT+1}-{Math.min(page*LIMIT,total)} of {total}</p>
            <div className="flex gap-2">
              <button onClick={()=>load(page-1)} disabled={page===1} className="glass glass-hover px-4 py-2 rounded-xl text-sm text-gray-500 disabled:opacity-30">Prev</button>
              <button onClick={()=>load(page+1)} disabled={page>=Math.ceil(total/LIMIT)} className="glass glass-hover px-4 py-2 rounded-xl text-sm text-gray-500 disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}