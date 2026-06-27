import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

const FEATURES = [
  {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
    title: 'Find Nearby Parking',
    desc:  'Browse available parking spots near you with live slot counts and interactive map view.',
    color: '#3b82f6', bg: '#eff6ff',
  },
  {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
    title: 'Instant Reservation',
    desc:  'Book a spot in under a minute. No queues, no calls — just pick, confirm and park.',
    color: '#8b5cf6', bg: '#f5f3ff',
  },
  {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1"/></svg>,
    title: 'Transparent Pricing',
    desc:  'Hourly rates shown upfront. No hidden fees — pay only for the time you actually use.',
    color: '#22c55e', bg: '#f0fdf4',
  },
  {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
    title: 'Secure & Reliable',
    desc:  'Your bookings and data are protected with industry-standard encryption and authentication.',
    color: '#f59e0b', bg: '#fffbeb',
  },
  {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>,
    title: 'Mobile Optimised',
    desc:  'Built mobile-first. Manage reservations, track entry/exit and download receipts on the go.',
    color: '#ef4444', bg: '#fef2f2',
  },
  {
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
    title: 'Owner Dashboard',
    desc:  'Powerful analytics for parking operators — revenue, occupancy, reservations and manager tools.',
    color: '#6366f1', bg: '#eef2ff',
  },
];

const STEPS = [
  { n:'01', title:'Search',   desc:'Find available parking near your destination with real-time slot availability.', color:'#6366f1' },
  { n:'02', title:'Reserve',  desc:'Select a time, enter your vehicle details and confirm your booking instantly.',  color:'#3b82f6' },
  { n:'03', title:'Park',     desc:'Arrive at the lot. The manager checks you in and your slot is marked active.',   color:'#22c55e' },
  { n:'04', title:'Complete', desc:'Exit when done — your slot is freed and a receipt is ready to download.',       color:'#8b5cf6' },
];

const STATS = [
  { value:'500+',  label:'Parking Locations' },
  { value:'10K+',  label:'Happy Drivers'     },
  { value:'50K+',  label:'Reservations'      },
  { value:'99.9%', label:'Uptime'            },
];

const TESTIMONIALS = [
  { name:'Sarah K.', role:'Daily Commuter',     text:'ParkBangla saved me 30 minutes every morning. I book on my phone before leaving home!',      stars:5, color:'#6366f1', initials:'SK' },
  { name:'James T.', role:'Parking Owner',      text:'My occupancy went from 60% to 95% after listing on ParkBangla. The analytics are great.',    stars:5, color:'#22c55e', initials:'JT' },
  { name:'Maria L.', role:'Business Traveller', text:'Finding parking in the city used to stress me out. Now I arrive knowing exactly where to go.', stars:5, color:'#f59e0b', initials:'ML' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [query,  setQuery]  = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/search${query ? `?search=${encodeURIComponent(query)}` : ''}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden"
        style={{ background:'linear-gradient(135deg,#0f0c29 0%,#1e1b4b 45%,#302b63 75%,#1a1a2e 100%)' }}>

        {/* Glow blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full opacity-20"
            style={{ background:'radial-gradient(circle,#6366f1,transparent 70%)', filter:'blur(80px)' }}/>
          <div className="absolute bottom-1/4 right-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] rounded-full opacity-15"
            style={{ background:'radial-gradient(circle,#3b82f6,transparent 70%)', filter:'blur(60px)' }}/>
          <div className="absolute top-1/4 right-1/3 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] rounded-full opacity-10"
            style={{ background:'radial-gradient(circle,#8b5cf6,transparent 70%)', filter:'blur(50px)' }}/>
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.035]"
            style={{ backgroundImage:'radial-gradient(circle,#ffffff 1px,transparent 1px)', backgroundSize:'32px 32px' }}/>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
          <div className="max-w-3xl mx-auto text-center">

            {/* Pill */}
            <div className="inline-flex items-center gap-2 bg-white/8 border border-white/15 text-white/70 rounded-full px-4 py-1.5 text-sm font-medium mb-5 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0"/>
              Live availability · 500+ locations
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl text-white leading-[1.1] mb-5"
              style={{ fontFamily:"'Roboto Slab', serif", fontWeight:700 }}>
              Find. Book.{' '}
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage:'linear-gradient(90deg,#818cf8 0%,#60a5fa 50%,#a78bfa 100%)' }}>
                Park.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-white/55 mb-7 leading-relaxed max-w-xl mx-auto">
              Bangladesh's smartest parking platform — reserve a spot in under a minute, anywhere in the city.
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white rounded-2xl p-2 shadow-2xl max-w-xl mx-auto mb-6"
              style={{ boxShadow:'0 20px 60px rgba(0,0,0,0.4)' }}>
              <div className="flex items-center gap-3 flex-1 px-3">
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input type="text"
                  placeholder="Search city, street or parking name..."
                  value={query} onChange={e => setQuery(e.target.value)}
                  className="flex-1 bg-transparent text-gray-800 placeholder-gray-400 outline-none text-sm font-medium py-2"/>
                {query && (
                  <button type="button" onClick={()=>setQuery('')} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>
              <button type="submit"
                className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 flex-shrink-0 w-full sm:w-auto"
                style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)', boxShadow:'0 4px 14px rgba(99,102,241,0.5)' }}>
                Find Parking
              </button>
            </form>

            {/* Trust pills */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {[
                { label:'No hidden fees',       icon:<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1"/></svg> },
                { label:'Free cancellation',    icon:<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
                { label:'Instant confirmation', icon:<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> },
              ].map(t => (
                <div key={t.label}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-white/70 backdrop-blur-sm transition-all hover:text-white"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
                  }}>
                  <span className="text-indigo-300">{t.icon}</span>
                  {t.label}
                </div>
              ))}
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
            {STATS.map(s => (
              <div key={s.label}
                className="text-center py-4 px-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                <p className="text-2xl font-extrabold text-white mb-0.5">{s.value}</p>
                <p className="text-xs text-white/40 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────── */}
      <section className="py-12 sm:py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-14">
            <span className="inline-block text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-3">
              Why ParkBangla
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-gray-900 mb-3" style={{ fontFamily:"'Roboto Slab', serif", fontWeight:700 }}>
              Everything you need, nothing you don't
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto text-sm sm:text-base">
              A complete parking management platform for drivers and operators.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {FEATURES.map(f => (
              <div key={f.title}
                className="group p-4 sm:p-5 lg:p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-default bg-white">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-4 sm:mb-5 transition-transform group-hover:scale-110"
                  style={{ background:f.bg, color:f.color }}>
                  {f.icon}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1.5 sm:mb-2 group-hover:text-indigo-700 transition-colors">{f.title}</h3>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────── */}
      <section className="py-12 sm:py-20 lg:py-24" style={{ background:'#f8fafc' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-14">
            <span className="inline-block text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-3">
              Simple Process
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-gray-900 mb-3" style={{ fontFamily:"'Roboto Slab', serif", fontWeight:700 }}>
              Parked in 4 easy steps
            </h2>
            <p className="text-sm sm:text-base text-gray-500 max-w-md mx-auto">From search to parked — the entire process takes under 2 minutes.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 lg:p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-white text-base sm:text-lg lg:text-xl font-extrabold mb-3 sm:mb-4 lg:mb-5 transition-transform group-hover:scale-105"
                  style={{ background:`linear-gradient(135deg,${s.color},${s.color}bb)`, boxShadow:`0 4px 14px ${s.color}30` }}>
                  {s.n}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-[52px] left-[calc(100%-1px)] w-6 h-px bg-gray-200 z-10"/>
                )}
                <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1 sm:mb-2">{s.title}</h3>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR DRIVERS & OWNERS ───────────────────────────── */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl text-gray-900 mb-4" style={{ fontFamily:"'Roboto Slab', serif", fontWeight:700 }}>Built for everyone</h2>
            <p className="text-gray-500 max-w-md mx-auto">Whether you park or own a lot, ParkBangla works for you.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Drivers card */}
            <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8"
              style={{ background:'linear-gradient(135deg,#1e1b4b 0%,#3730a3 60%,#4f46e5 100%)' }}>
              <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-white/5 pointer-events-none"/>
              <div className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full bg-indigo-400/10 pointer-events-none"/>
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.5.5M13 16H3m10 0h1m3-10h-3a2 2 0 00-2 2v1h7.5L19 7l-2-1z"/>
                  </svg>
                </div>
                <span className="text-indigo-300 text-xs font-bold uppercase tracking-widest">For Drivers</span>
                <h3 className="text-2xl font-extrabold text-white mt-1 mb-3">Stop circling the block</h3>
                <p className="text-indigo-200 text-sm mb-7 leading-relaxed">
                  Find and book parking before you leave home. Know exactly where you're going and walk in stress-free.
                </p>
                <ul className="space-y-3 mb-8">
                  {['Real-time slot availability','One-tap booking','Entry & exit tracking','Reservation history','Downloadable receipts'].map(item => (
                    <li key={item} className="flex items-center gap-3 text-sm text-white/80">
                      <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-400/30 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                        </svg>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-indigo-700 bg-white hover:bg-indigo-50 transition-all shadow-lg">
                  Get Started Free
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </Link>
              </div>
            </div>

            {/* Owners card */}
            <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 border border-gray-100 shadow-sm bg-white">
              <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-indigo-50 pointer-events-none"/>
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                  </svg>
                </div>
                <span className="text-indigo-600 text-xs font-bold uppercase tracking-widest">For Parking Owners</span>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-1 mb-3">Turn empty space into revenue</h3>
                <p className="text-gray-500 text-sm mb-7 leading-relaxed">
                  List your parking locations and let ParkBangla handle bookings, payments and operations for you.
                </p>
                <ul className="space-y-3 mb-8">
                  {['List unlimited locations','Live occupancy dashboard','Revenue analytics','Manager role assignment','Approve & manage bookings'].map(item => (
                    <li key={item} className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                        </svg>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-lg"
                  style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)', boxShadow:'0 4px 14px rgba(99,102,241,0.35)' }}>
                  List Your Parking
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────── */}
      <section className="py-12 sm:py-20 lg:py-24" style={{ background:'#f8fafc' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-14">
            <span className="inline-block text-xs font-bold text-amber-600 uppercase tracking-widest bg-amber-50 border border-amber-100 rounded-full px-4 py-1.5 mb-3">
              Testimonials
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl text-gray-900 mb-2" style={{ fontFamily:"'Roboto Slab', serif", fontWeight:700 }}>Loved by drivers and owners</h2>
            <p className="text-sm text-gray-400">Real stories from real users</p>
          </div>

          {/* Mobile: horizontal scroll | Desktop: grid */}
          <div className="flex sm:grid sm:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 overflow-x-auto sm:overflow-visible pb-4 sm:pb-0 snap-x snap-mandatory"
            style={{ scrollbarWidth:'none', msOverflowStyle:'none' }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name}
                className="flex-shrink-0 w-[80vw] sm:w-auto snap-center rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background:'rgba(255,255,255,0.85)',
                  backdropFilter:'blur(20px)',
                  WebkitBackdropFilter:'blur(20px)',
                  border:`1px solid ${t.color}18`,
                  boxShadow:`0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px ${t.color}10`,
                }}>

                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array(t.stars).fill(0).map((_,i) => (
                    <svg key={i} className="w-4 h-4 fill-current text-amber-400" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                </div>

                {/* Quote */}
                <p className="text-gray-600 text-sm leading-relaxed mb-6">"{t.text}"</p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4" style={{ borderTop:'1px solid #f1f5f9' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0"
                    style={{ background:`linear-gradient(135deg,${t.color},${t.color}aa)`, boxShadow:`0 4px 12px ${t.color}40` }}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs font-medium" style={{ color: t.color }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile scroll dots */}
          <div className="flex sm:hidden justify-center gap-1.5 mt-5">
            {TESTIMONIALS.map((_,i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background:'#cbd5e1' }}/>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 relative overflow-hidden"
        style={{ background:'linear-gradient(135deg,#0f0c29 0%,#1e1b4b 45%,#4f46e5 100%)' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-15"
            style={{ background:'radial-gradient(circle,#6366f1,transparent)', filter:'blur(100px)' }}/>
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage:'radial-gradient(circle,#ffffff 1px,transparent 1px)', backgroundSize:'32px 32px' }}/>
        </div>
        <div className="relative max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl text-white mb-4 leading-tight" style={{ fontFamily:"'Roboto Slab', serif", fontWeight:700 }}>
            Ready to park without the stress?
          </h2>
          <p className="text-white/50 mb-10 text-base leading-relaxed">
            Join thousands of drivers and parking owners who've made parking effortless. Free to sign up — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register"
              className="px-8 py-4 rounded-2xl text-sm font-bold text-indigo-700 bg-white hover:bg-indigo-50 transition-all shadow-xl">
              Create Free Account
            </Link>
            <Link to="/search"
              className="px-8 py-4 rounded-2xl text-sm font-semibold text-white/80 border border-white/20 hover:bg-white/8 hover:text-white transition-all">
              Browse Parking Spots
            </Link>
          </div>
          <p className="text-white/25 text-xs mt-6">Free forever for drivers · No credit card needed · Cancel anytime</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
