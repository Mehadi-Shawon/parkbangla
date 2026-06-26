/**
 * Premium admin page header with glassmorphism stat chips.
 * Usage: <AdminPageHeader icon={...} label="Section" title="Title" subtitle="..."
 *          color="#6366f1" stats={[{value:'234', label:'Total'}]} right={<button/>} />
 */
export default function AdminPageHeader({ icon, label, title, subtitle, color = '#6366f1', stats, right }) {
  return (
    <div className="rounded-2xl overflow-hidden mb-7 relative"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: `0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px ${color}15`,
      }}>

      {/* Subtle color wash in background */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${color}08, transparent 60%)` }}/>

      <div className="relative px-5 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-4">

        {/* Left: icon + text */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg,${color},${color}bb)`, boxShadow: `0 6px 18px ${color}40` }}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] mb-0.5" style={{ color }}>
              {label}
            </p>
            <h1 className="text-xl font-extrabold text-gray-900 leading-tight">{title}</h1>
            {subtitle && <p className="text-sm text-gray-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>

        {/* Right: stats + action */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {stats?.map((s, i) => (
            <div key={i} className="flex flex-col items-center px-3.5 py-2 rounded-xl text-center"
              style={{
                background: `${color}08`,
                border: `1px solid ${color}18`,
              }}>
              <p className="text-lg font-extrabold leading-none" style={{ color }}>{s.value}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5 whitespace-nowrap">{s.label}</p>
            </div>
          ))}
          {right && <div className="flex items-center gap-2 ml-1">{right}</div>}
        </div>
      </div>
    </div>
  );
}
