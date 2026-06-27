import { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import ParkingDetailModal from "../../components/admin/ParkingDetailModal";
import * as adminService from "../../services/adminService";
import { log } from "../../services/activityService";
import { formatDate, formatCurrency } from "../../utils/helpers";
import { downloadCSV, PARKING_COLUMNS } from "../../utils/csvExport";
import toast from "react-hot-toast";

const STATUSES = ["","pending","approved","rejected","inactive"];
const LIMIT = 12;

const STATUS_CONFIG = {
  pending:  { bg:"#fffbeb", color:"#d97706", border:"#fde68a", dot:"#f59e0b" },
  approved: { bg:"#f0fdf4", color:"#16a34a", border:"#bbf7d0", dot:"#22c55e" },
  rejected: { bg:"#fef2f2", color:"#dc2626", border:"#fecaca", dot:"#ef4444" },
  inactive: { bg:"#f9fafb", color:"#6b7280", border:"#e5e7eb", dot:"#9ca3af" },
};

export default function AdminParkings() {
  const [parkings,  setParkings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("");
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const [actioning, setActioning] = useState(null);
  const [detail,    setDetail]    = useState(null);

  const load = async (p=1, status=filter) => {
    setLoading(true);
    try {
      const { data, total: t } = await adminService.getAllParkings({ status, page:p, limit:LIMIT });
      setParkings(data); setTotal(t); setPage(p);
    } catch { toast.error("Failed to load."); }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const handleFilter = s => { setFilter(s); load(1, s); };

  const handleStatus = async (id, status) => {
    setActioning(id);
    try {
      await adminService.setParkingStatus(id, status);
      toast.success(`Parking ${status}.`);
      const p = parkings.find(x => x.id === id);
      if (status === "approved" || status === "rejected") {
        log({ action:`parking.${status}`, entityType:"parking", entityId:id, meta:{ parking_name:p?.name } });
      }
      load(page, filter);
    } catch (err) { toast.error(err.message || "Failed."); }
    finally { setActioning(null); }
  };

  const exportCSV = () => downloadCSV(parkings, PARKING_COLUMNS, `parkings-${new Date().toISOString().slice(0,10)}.csv`);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <AdminPageHeader
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5"/></svg>}
          label="Management" title="Parking Locations"
          subtitle="Approve and manage all parking properties"
          color="#6366f1"
          stats={[
            { value: total, label: 'Total' },
            { value: parkings.filter(p => p.status === 'approved').length, label: 'Approved' },
            { value: parkings.filter(p => p.status === 'pending').length,  label: 'Pending'  },
          ]}
          right={
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90" style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export CSV
            </button>
          }
        />

        {/* Filter tabs */}
        <div className="flex gap-1 p-1.5 bg-gray-100 rounded-full mb-6">
          {STATUSES.map(s => (
            <button key={s} onClick={() => handleFilter(s)}
              className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all text-center ${filter===s ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              style={filter===s ? { background:'linear-gradient(135deg,#6366f1,#2563eb)' } : {}}>
              {s ? s.charAt(0).toUpperCase()+s.slice(1) : "All"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_,i) => <div key={i} className="h-48 bg-white rounded-2xl border border-gray-100 animate-pulse"/>)}
          </div>
        ) : parkings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5"/></svg>
            </div>
            <p className="text-sm font-semibold text-gray-500">No parking locations found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {parkings.map(p => {
              const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.inactive;
              const occupancy = p.total_slots > 0 ? Math.round(((p.total_slots - p.available_slots) / p.total_slots) * 100) : 0;
              const barColor = occupancy >= 90 ? '#ef4444' : occupancy >= 60 ? '#f59e0b' : '#22c55e';
              return (
                <div key={p.id}
                  className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background:'rgba(255,255,255,0.85)',
                    backdropFilter:'blur(20px)',
                    WebkitBackdropFilter:'blur(20px)',
                    border:`1px solid ${sc.dot}30`,
                    boxShadow:`0 4px 20px ${sc.dot}20, 0 0 0 1px ${sc.dot}10`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow=`0 12px 36px ${sc.dot}35, 0 0 0 1px ${sc.dot}20`}
                  onMouseLeave={e => e.currentTarget.style.boxShadow=`0 4px 20px ${sc.dot}20, 0 0 0 1px ${sc.dot}10`}
                  onClick={() => setDetail(p)}>

                  {/* Glow background */}
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background:`radial-gradient(ellipse at top right, ${sc.dot}12, transparent 60%)` }}/>

                  <div className="relative p-5">
                    {/* Top row: icon + status + action */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      {/* Parking icon */}
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0"
                        style={{ background:`linear-gradient(135deg,${sc.dot},${sc.color})`, boxShadow:`0 6px 16px ${sc.dot}50` }}>
                        P
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className="text-sm font-extrabold text-gray-900 truncate leading-tight">{p.name}</h3>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{p.address}</p>
                      </div>
                      <span className="flex-shrink-0 flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-full capitalize"
                        style={{ background:`${sc.dot}15`, color: sc.color, border:`1px solid ${sc.dot}25` }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }}/>
                        {p.status}
                      </span>
                    </div>

                    {/* Stats pills */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {[
                        { label:'Owner', value: p.owner?.name||'—' },
                        { label:'Rate',  value: `${formatCurrency(p.hourly_rate)}/hr` },
                        { label:'Slots', value: `${p.available_slots}/${p.total_slots} free` },
                      ].map(d => (
                        <div key={d.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                          style={{ background:'rgba(0,0,0,0.04)', border:'1px solid rgba(0,0,0,0.06)' }}>
                          <span className="text-gray-400 font-medium">{d.label}:</span>
                          <span className="font-bold text-gray-700">{d.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Occupancy */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Occupancy</span>
                        <span className="text-sm font-extrabold" style={{ color: barColor }}>{occupancy}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background:'rgba(0,0,0,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width:`${occupancy}%`, background:`linear-gradient(90deg,${barColor}aa,${barColor})`, boxShadow:`0 0 8px ${barColor}60` }}/>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2" onClick={e=>e.stopPropagation()}>
                      <span className="text-[10px] text-gray-300">{formatDate(p.created_at)}</span>
                      <div className="flex gap-1.5">
                        {p.status !== "approved" && (
                          <button onClick={() => handleStatus(p.id,"approved")} disabled={actioning===p.id}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-white disabled:opacity-40 hover:brightness-110 hover:scale-105 active:scale-95 transition-all"
                            style={{ background:'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow:'0 2px 8px rgba(34,197,94,0.4)' }}>
                            {actioning===p.id?'…':'Approve'}
                          </button>
                        )}
                        {p.status !== "rejected" && (
                          <button onClick={() => handleStatus(p.id,"rejected")} disabled={actioning===p.id}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-white disabled:opacity-40 hover:brightness-110 hover:scale-105 active:scale-95 transition-all"
                            style={{ background:'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow:'0 2px 8px rgba(239,68,68,0.4)' }}>
                            {actioning===p.id?'…':'Reject'}
                          </button>
                        )}
                        {p.status === "approved" && (
                          <button onClick={() => handleStatus(p.id,"inactive")} disabled={actioning===p.id}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-all">
                            {actioning===p.id?'…':'Deactivate'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {total > LIMIT && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-xs text-gray-400">Page {page} of {Math.ceil(total/LIMIT)}</p>
            <div className="flex gap-2">
              <button onClick={()=>load(page-1)} disabled={page===1}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-500 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 transition-all">← Prev</button>
              <button onClick={()=>load(page+1)} disabled={page>=Math.ceil(total/LIMIT)}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-500 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 transition-all">Next →</button>
            </div>
          </div>
        )}
      </div>

      {detail && (
        <ParkingDetailModal
          parking={detail}
          onClose={() => setDetail(null)}
          onChanged={() => { load(page,filter); setDetail(null); }}
        />
      )}
    </AdminLayout>
  );
}