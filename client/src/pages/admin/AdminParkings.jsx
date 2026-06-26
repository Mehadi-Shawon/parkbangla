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

const statusBadge = (s) => ({
  pending:  "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  inactive: "bg-gray-100 text-gray-500 border-gray-200",
}[s] || "");

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

        <div className="flex gap-1.5 mb-6 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => handleFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${filter===s ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-500 border-gray-200 hover:border-indigo-200"}`}>
              {s ? s.charAt(0).toUpperCase()+s.slice(1) : "All Statuses"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array(6).fill(0).map((_,i) => <div key={i} className="h-44 admin-card rounded-2xl animate-pulse"/>)}
          </div>
        ) : parkings.length === 0 ? (
          <div className="admin-card rounded-2xl flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-sm">No parking locations found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {parkings.map(p => (
              <div key={p.id} className="admin-card rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-all" onClick={() => setDetail(p)}>
                <div className="p-5">
                  <div className="flex items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-base font-bold text-gray-900 truncate">{p.name}</h3>
                        <span className={`capitalize text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusBadge(p.status)}`}>{p.status}</span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{p.address}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label:"Owner", value: p.owner?.name||"--" },
                      { label:"Slots", value: `${p.available_slots}/${p.total_slots}` },
                      { label:"Rate",  value: `${formatCurrency(p.hourly_rate)}/hr` },
                    ].map(d => (
                      <div key={d.label} className="rounded-xl px-3 py-2 bg-gray-50 border border-gray-100">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{d.label}</p>
                        <p className="text-sm font-semibold text-gray-700 truncate">{d.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between" onClick={e=>e.stopPropagation()}>
                    <span className="text-[10px] text-gray-400">Added {formatDate(p.created_at)}</span>
                    <div className="flex gap-1.5">
                      {p.status !== "approved" && <button onClick={() => handleStatus(p.id,"approved")} disabled={actioning===p.id} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40">Approve</button>}
                      {p.status !== "rejected" && <button onClick={() => handleStatus(p.id,"rejected")} disabled={actioning===p.id} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 disabled:opacity-40">Reject</button>}
                      {p.status === "approved" && <button onClick={() => handleStatus(p.id,"inactive")} disabled={actioning===p.id} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200 disabled:opacity-40">Deactivate</button>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {total > LIMIT && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={()=>load(page-1)} disabled={page===1} className="glass glass-hover px-4 py-2 rounded-xl text-sm text-gray-500 disabled:opacity-30">Prev</button>
            <span className="text-sm text-gray-400">Page {page} of {Math.ceil(total/LIMIT)}</span>
            <button onClick={()=>load(page+1)} disabled={page>=Math.ceil(total/LIMIT)} className="glass glass-hover px-4 py-2 rounded-xl text-sm text-gray-500 disabled:opacity-30">Next</button>
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