export default function AdminPageHeader({ icon, label, title, subtitle, color = '#6366f1', stats, right }) {
  return (
    <div className="relative rounded-2xl overflow-hidden mb-7"
      style={{ boxShadow:`0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px ${color}20` }}>

      {/* Dark gradient background */}
      <div className="absolute inset-0"
        style={{ background:`linear-gradient(135deg,#0a0818 0%,#0f0c29 40%,${color}40 100%)` }}/>

      {/* Decorative orbs */}
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
        style={{ background:`radial-gradient(circle,${color}30,transparent 70%)`, filter:'blur(20px)' }}/>
      <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full pointer-events-none"
        style={{ background:`radial-gradient(circle,${color}15,transparent 70%)`, filter:'blur(30px)' }}/>
      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize:'24px 24px' }}/>

      <div className="relative px-5 sm:px-6 py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center gap-5">

        {/* Left: icon + text */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
            style={{ background:`rgba(255,255,255,0.12)`, border:`1px solid rgba(255,255,255,0.2)`, boxShadow:`0 4px 16px ${color}40` }}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-1"
              style={{ color:`${color}cc` }}>
              {label}
            </p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">{title}</h1>
            {subtitle && <p className="text-sm mt-0.5 truncate" style={{ color:'rgba(255,255,255,0.45)' }}>{subtitle}</p>}
          </div>
        </div>

        {/* Right: stats + action */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {stats?.map((s, i) => (
            <div key={i} className="flex flex-col items-center px-3.5 py-2.5 rounded-xl text-center"
              style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', backdropFilter:'blur(8px)' }}>
              <p className="text-lg font-extrabold leading-none text-white">{s.value}</p>
              <p className="text-[10px] font-medium mt-0.5 whitespace-nowrap" style={{ color:'rgba(255,255,255,0.45)' }}>{s.label}</p>
            </div>
          ))}
          {right && <div className="flex items-center gap-2 ml-1">{right}</div>}
        </div>
      </div>
    </div>
  );
}
