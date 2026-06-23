import { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import UserDetailDrawer from "../../components/admin/UserDetailDrawer";
import * as adminService from "../../services/adminService";
import { log } from "../../services/activityService";
import { formatDate } from "../../utils/helpers";
import { downloadCSV, USER_COLUMNS } from "../../utils/csvExport";
import toast from "react-hot-toast";

const ROLES = ["","driver","owner","admin"];
const LIMIT = 15;

export default function ManageUsers() {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [role,       setRole]       = useState("");
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [toggling, setToggling] = useState(null);
  const [drawer,   setDrawer]   = useState(null);

  const load = async (p=1, r=role, s=search) => {
    setLoading(true);
    try {
      const { data, total: t } = await adminService.getAllUsers({ search:s, role:r, page:p, limit:LIMIT });
      setUsers(data); setTotal(t); setPage(p);
    } catch { toast.error("Failed to load users."); }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (id, isActive, name) => {
    setToggling(id);
    try {
      await adminService.setUserActive(id, !isActive);
      toast.success(`User ${isActive ? "deactivated" : "activated"}.`);
      log({ action: isActive ? "user.deactivated" : "user.activated", entityType:"user", entityId:id, meta:{ target_name:name } });
      load(page, role, search);
    } catch (err) { toast.error(err.message || "Failed."); }
    finally { setToggling(null); }
  };

  const exportCSV = () => downloadCSV(users, USER_COLUMNS, `users-${new Date().toISOString().slice(0,10)}.csv`);

  const roleBadge = (r) => ({
    admin:  "bg-violet-100 text-violet-700 border-violet-200",
    owner:  "bg-blue-100 text-blue-700 border-blue-200",
    driver: "bg-gray-100 text-gray-600 border-gray-200",
    manager:"bg-indigo-100 text-indigo-700 border-indigo-200",
  }[r] || "");

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        <AdminPageHeader
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}
          label="Management" title="Users"
          subtitle={`${total} total accounts`}
          color="#3b82f6"
          right={
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:text-indigo-600 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export CSV
            </button>
          }
        />

        <div className="flex gap-3 mb-6 flex-wrap">
          <form onSubmit={e=>{e.preventDefault();load(1,role,search);}} className="flex gap-2 flex-1 min-w-56">
            <input className="input flex-1 text-sm" placeholder="Search by name or email..."
              value={search} onChange={e=>setSearch(e.target.value)} />
            <button type="submit" className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background:"linear-gradient(135deg,#6366f1,#2563eb)" }}>Search</button>
          </form>
          <div className="flex gap-1.5 flex-wrap">
            {ROLES.map(r => (
              <button key={r} onClick={() => { setRole(r); load(1,r,search); }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${role===r ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-gray-200 text-gray-500 hover:border-indigo-200"}`}>
                {r ? r.charAt(0).toUpperCase()+r.slice(1) : "All"}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["User","Email","Role","Joined","Status","Action"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color:"#6366f1", background:"linear-gradient(to right,#eef2ff,#f5f3ff)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array(6).fill(0).map((_,i) => (
                  <tr key={i}><td colSpan={6} className="px-5 py-3"><div className="h-8 rounded-lg animate-pulse bg-gray-50"/></td></tr>
                )) : users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-14 text-gray-400 text-sm">No users found.</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} onClick={() => setDrawer(u)}
                    className="border-b border-gray-50 last:border-0 transition-colors cursor-pointer hover:bg-indigo-50/30">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background:"linear-gradient(135deg,#6366f1,#2563eb)" }}>{u.name.charAt(0)}</div>
                        <span className="text-sm font-medium text-gray-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{u.email}</td>
                    <td className="px-5 py-3.5"><span className={`capitalize text-xs font-semibold px-2.5 py-0.5 rounded-full border ${roleBadge(u.role)}`}>{u.role}</span></td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">{formatDate(u.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${u.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5" onClick={e=>e.stopPropagation()}>
                      {u.role !== "admin" && (
                        <button onClick={() => handleToggle(u.id, u.is_active, u.name)} disabled={toggling===u.id}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all disabled:opacity-40 ${u.is_active ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100" : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"}`}>
                          {toggling===u.id ? "..." : u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {total > LIMIT && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={()=>load(page-1)} disabled={page===1} className="glass glass-hover px-4 py-2 rounded-xl text-sm text-gray-500 disabled:opacity-30">Prev</button>
            <span className="text-sm text-gray-400">Page {page} of {Math.ceil(total/LIMIT)}</span>
            <button onClick={()=>load(page+1)} disabled={page>=Math.ceil(total/LIMIT)} className="glass glass-hover px-4 py-2 rounded-xl text-sm text-gray-500 disabled:opacity-30">Next</button>
          </div>
        )}
      </div>

      {drawer && (
        <UserDetailDrawer
          user={drawer}
          onClose={() => setDrawer(null)}
          onStatusChanged={() => { load(page,role,search); setDrawer(null); }}
        />
      )}
    </AdminLayout>
  );
}