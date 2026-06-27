import { Link } from 'react-router-dom';

const COLS = [
  {
    title: 'Product',
    links: [
      { label:'Find Parking',    to:'/search'    },
      { label:'How It Works',    to:'/'          },
      { label:'Live Map',        to:'/search'    },
      { label:'For Owners',      to:'/register'  },
      { label:'Pricing',         to:'/'          },
    ],
  },
  {
    title: 'Drivers',
    links: [
      { label:'Create Account',  to:'/register'  },
      { label:'Sign In',         to:'/login'     },
      { label:'My Bookings',     to:'/reservations' },
      { label:'Vehicle Manager', to:'/profile'   },
      { label:'Receipts',        to:'/reservations' },
    ],
  },
  {
    title: 'Owners',
    links: [
      { label:'List a Parking',  to:'/register'  },
      { label:'Owner Dashboard', to:'/owner'     },
      { label:'Analytics',       to:'/owner'     },
      { label:'Manager Tools',   to:'/owner/managers' },
      { label:'Revenue Reports', to:'/owner'     },
    ],
  },
  {
    title: 'Company',
    links: [
      { label:'About',           to:'/'          },
      { label:'Blog',            to:'/'          },
      { label:'Careers',         to:'/'          },
      { label:'Contact',         to:'/'          },
      { label:'Press Kit',       to:'/'          },
    ],
  },
];

const SOCIALS = [
  { name:'X', href:'#', icon:<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  { name:'LinkedIn', href:'#', icon:<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
  { name:'Instagram', href:'#', icon:<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
  { name:'YouTube', href:'#', icon:<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
];

export default function Footer() {
  return (
    <footer style={{ background:'linear-gradient(to bottom,#09091a,#0f0c29)' }}>

      {/* Subtle top glow */}
      <div className="relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px"
          style={{ background:'linear-gradient(to right,transparent,rgba(99,102,241,0.5),transparent)' }}/>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Upper section */}
        <div className="pt-16 pb-12 grid grid-cols-1 lg:grid-cols-5 gap-12">

          {/* Brand — col span 1 */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            {/* Logo */}
            <Link to="/" className="w-fit">
              <span className="font-brand text-xl text-white">
                ParkBangla
              </span>
            </Link>

            <p className="text-xs text-white/30 leading-relaxed">
              The smartest way to find and manage parking — for drivers and operators.
            </p>

            {/* Social icons */}
            <div className="flex gap-2">
              {SOCIALS.map(s => (
                <a key={s.name} href={s.href} title={s.name}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/25 hover:text-white transition-all duration-200"
                  style={{ border:'1px solid rgba(255,255,255,0.07)' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(99,102,241,0.15)'; e.currentTarget.style.borderColor='rgba(99,102,241,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; }}>
                  {s.icon}
                </a>
              ))}
            </div>

          </div>

          {/* Nav columns + Newsletter — col span 4 */}
          <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-5 gap-8">
            {COLS.map(col => (
              <div key={col.title}>
                <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.15em] mb-5">{col.title}</p>
                <ul className="space-y-3.5">
                  {col.links.map(l => (
                    <li key={l.label}>
                      <Link to={l.to}
                        className="text-[13px] text-white/35 hover:text-white/80 transition-colors duration-150 leading-none">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Newsletter column */}
            <div>
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.15em] mb-5">Newsletter</p>
              <p className="text-xs text-white/25 leading-relaxed mb-4">
                Get updates on new locations and features.
              </p>
              <form className="flex flex-col gap-2" onSubmit={e => e.preventDefault()}>
                <input type="email" placeholder="your@email.com"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs text-white placeholder-white/20 outline-none transition-all"
                  style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}
                  onFocus={e => e.target.style.borderColor='rgba(99,102,241,0.5)'}
                  onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'}/>
                <button type="submit"
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                  style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)' }}>
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full" style={{ background:'linear-gradient(to right,transparent,rgba(255,255,255,0.06) 20%,rgba(255,255,255,0.06) 80%,transparent)' }}/>

        {/* Bottom bar */}
        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 order-2 sm:order-1">
            <p className="text-xs text-white/20">
              © {new Date().getFullYear()} ParkBangla, Inc. All rights reserved.
            </p>
            <span className="hidden sm:block text-white/10">·</span>
            <p className="text-[11px] text-white/15">
              Designed & developed by <a href="https://qraftdigital.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-indigo-400/60 font-semibold hover:text-indigo-400 transition-colors">Qraft Digital</a>
            </p>
          </div>
          <div className="flex items-center gap-5 order-1 sm:order-2">
            {['Privacy Policy','Terms of Service','Cookie Policy'].map(l => (
              <Link key={l} to="/" className="text-xs text-white/20 hover:text-white/45 transition-colors">
                {l}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
