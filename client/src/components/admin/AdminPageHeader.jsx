/**
 * Shared premium page header for all admin pages.
 * Usage: <AdminPageHeader icon={<svg.../>} label="Section" title="Page Title" subtitle="..." color="#6366f1" right={<button.../>} />
 */
export default function AdminPageHeader({ icon, label, title, subtitle, color = '#6366f1', right }) {
  return (
    <div className="flex items-start justify-between mb-8 flex-wrap gap-4 admin-page-header">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
          style={{ background: `linear-gradient(135deg,${color},${color}cc)`, boxShadow: `0 4px 14px ${color}40` }}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.15em] mb-0.5" style={{ color }}>
            {label}
          </p>
          <h1 className="text-2xl font-extrabold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}
