import { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import UserDetailDrawer from "../../components/admin/UserDetailDrawer";
import * as adminService from "../../services/adminService";
import { log } from "../../services/activityService";
import { formatDate } from "../../utils/helpers";
import { downloadCSV, USER_COLUMNS } from "../../utils/csvExport";
import toast from "react-hot-toast";

const ROLES = [
  { key:"",       label:"All"     },
  { key:"driver", label:"Drivers" },
  { key:"owner",  label:"Owners"  },
  { key:"manager",label:"Managers"},
  { key:"admin",  label:"Admins"  },
];
const LIMIT = 15;

const ROLE_STYLE = {
  admin:   { bg:"#f5f3ff", color:"#7c3aed", border:"#ddd6fe" },
  owner:   { bg:"#eff6ff", color:"#2563eb", border:"#bfdbfe" },
  driver:  { bg:"#f0fdf4", color:"#16a34a", border:"#bbf7d0" },
  manager: { bg:"#eef2ff", color:"#4f46e5", border:"#c7d2fe" },
};

export default function ManageUsers() {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [role,     setRole]     = useState("");
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const [toggling, setToggling] = useState(null);
  const [drawer,   setDrawer]   = useState(null);
  const [summary,  setSummary]  = useState(null);

  const load = async (p=1, r=role, s=search) => {
    setLoading(true);
    try {
      const { data, total: t } = await adminService.getAllUsers({ search:s, role:r, page:p, limit:LIMIT });
      setUsers(data); setTotal(t); setPage(p);
    } catch { toast.error("Failed to load users."); }
    finally  { setLoading(false); }
  };

  const loadSummary = async () => {
    const { data } = await adminService.getAllUsers({ limit: 1000 });
    const all = data || [];
    setSummary({
      total:   all.length,
      drivers: all.filter(u => u.role==='driver').length,
      owners:  all.filter(u => u.role==='owner').length,
      managers:all.filter(u => u.role==='manager').length,
      admins:  all.filter(u => u.role==='admin').length,
    });
  };

  useEffect(() => { load(); loadSummary(); }, []);

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
  const pages = Math.ceil(total / LIMIT);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">

        <AdminPageHeader
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}
          label="Management" title="Users"
          subtitle="Manage all registered accounts"
          color="#3b82f6"
          stats={summary ? [
            { value: summary.total,    label: 'Total'    },
            { value: summary.drivers,  label: 'Drivers'  },
            { value: summary.owners,   label: 'Owners'   },
            { value: summary.managers, label: 'Managers' },
          ] : []}
          right={
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
              style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export CSV
            </button>
          }
        />

        {/* Toolbar */}
        <div className="space-y-3 mb-6">
          {/* Search */}
          <form onSubmit={e=>{e.preventDefault();load(1,role,search);}} className="flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" placeholder="Search by name or email…"
                value={search} onChange={e=>setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"/>
              {search && (
                <button type="button" onClick={()=>{setSearch('');load(1,role,'');}}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              )}
            </div>
            <button type="submit" className="flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
              style={{ background:'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
              Search
            </button>
          </form>

          {/* Role filter — segmented */}
          <div className="flex gap-1 p-1.5 bg-gray-100 rounded-full">
            {ROLES.map(r => (
              <button key={r.key} onClick={() => { setRole(r.key); load(1,r.key,search); }}
                className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all text-center ${
                  role===r.key ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                style={role===r.key ? { background:'linear-gradient(135deg,#3b82f6,#2563eb)' } : {}}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="admin-card rounded-2xl overflow-hidden">

          {/* Mobile cards */}
          {!loading && users.length > 0 && (
            <div className="md:hidden p-3 space-y-2.5">
              {users.map(u => {
                const rs = ROLE_STYLE[u.role] || ROLE_STYLE.driver;
                return (
                  <div key={u.id} onClick={() => setDrawer(u)}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 cursor-pointer hover:border-blue-200 hover:shadow-md transition-all">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-extrabold"
                        style={{ background:'linear-gradient(135deg,#3b82f6,#2563eb)', boxShadow:'0 4px 10px rgba(59,130,246,0.35)' }}>
                        {u.name.charAt(0)}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${u.is_active ? 'bg-green-500' : 'bg-gray-300'}`}/>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="capitalize text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: rs.bg, color: rs.color, border:`1px solid ${rs.border}` }}>
                          {u.role}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    {/* Action */}
                    {u.role !== 'admin' && (
                      <button onClick={e=>{e.stopPropagation();handleToggle(u.id,u.is_active,u.name);}} disabled={toggling===u.id}
                        className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl transition-all disabled:opacity-40 hover:scale-105"
                        style={u.is_active
                          ? { background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', backdropFilter:'blur(8px)' }
                          : { background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff' }}>
                        {toggling===u.id ? '…' : u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full" style={{ minWidth:'640px' }}>
              <thead>
                <tr>
                  {["User","Email","Role","Joined","Status","Action"].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                      style={{ color:'#3b82f6', background:'#eff6ff', borderBottom:'2px solid #bfdbfe' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array(6).fill(0).map((_,i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-10 rounded-xl animate-pulse bg-gray-50"/></td></tr>
                )) : users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-16 text-gray-400 text-sm">No users found.</td></tr>
                ) : users.map(u => {
                  const rs = ROLE_STYLE[u.role] || ROLE_STYLE.driver;
                  return (
                    <tr key={u.id} onClick={() => setDrawer(u)}
                      className="border-b border-gray-50 last:border-0 transition-colors cursor-pointer hover:bg-blue-50/30">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                              style={{ background:'linear-gradient(135deg,#3b82f6,#2563eb)' }}>{u.name.charAt(0)}</div>
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${u.is_active ? 'bg-green-500' : 'bg-gray-300'}`}/>
                          </div>
                          <span className="text-sm font-semibold text-gray-800 truncate max-w-[120px]">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500 truncate max-w-[160px]">{u.email}</td>
                      <td className="px-4 py-3.5">
                        <span className="capitalize text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: rs.bg, color: rs.color, border:`1px solid ${rs.border}` }}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${u.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-red-400'}`}/>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5" onClick={e=>e.stopPropagation()}>
                        {u.role !== "admin" && (
                          <button onClick={() => handleToggle(u.id, u.is_active, u.name)} disabled={toggling===u.id}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 hover:scale-105 active:scale-95"
                            style={u.is_active
                              ? { background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', backdropFilter:'blur(8px)' }
                              : { background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', boxShadow:'0 2px 8px rgba(34,197,94,0.4)' }}>
                            {toggling===u.id ? "…" : u.is_active ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          {!loading && users.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">Showing {(page-1)*LIMIT+1}–{Math.min(page*LIMIT,total)} of {total} users</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-5">
            <button onClick={()=>load(page-1)} disabled={page===1}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-500 hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 transition-all">
              ← Prev
            </button>
            <span className="px-4 py-2 text-sm font-medium text-gray-500">
              {page} / {pages}
            </span>
            <button onClick={()=>load(page+1)} disabled={page>=pages}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-500 hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 transition-all">
              Next →
            </button>
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
