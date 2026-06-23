import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import DriverLayout from '../../components/driver/DriverLayout';
import MapComponent from '../../components/common/MapComponent';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import * as parkingService from '../../services/parkingService';
import { formatCurrency, availabilityColor } from '../../utils/helpers';
import toast from 'react-hot-toast';

/* ── Availability Ring ─────────────────────────────────── */
function AvailRing({ available, total }) {
  const pct   = total > 0 ? available / total : 0;
  const r     = 20;
  const circ  = 2 * Math.PI * r;
  const color = pct===0 ? '#ef4444' : pct<0.3 ? '#f97316' : pct<0.6 ? '#eab308' : '#22c55e';
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#f1f5f9" strokeWidth="4.5"/>
      <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="4.5"
        strokeDasharray={`${circ*pct} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 26 26)"/>
      <text x="26" y="30" textAnchor="middle" fontSize="10" fontWeight="800" fill={color}>
        {available}
      </text>
    </svg>
  );
}

/* ── Parking Card ──────────────────────────────────────── */
function ParkingCard({ p }) {
  const amenities = Array.isArray(p.amenities) ? p.amenities : JSON.parse(p.amenities||'[]');
  const pct = p.total_slots > 0 ? (p.available_slots/p.total_slots)*100 : 0;
  const isFull = p.available_slots === 0;

  return (
    <Link to={`/parking/${p.id}`}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group flex flex-col">
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start gap-3 mb-4">
          <AvailRing available={p.available_slots} total={p.total_slots}/>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-700 transition-colors truncate">{p.name}</h3>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
              {p.address}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isFull ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {isFull ? 'Full' : `${p.available_slots} free`}
              </span>
              <span className="text-[11px] text-gray-400">of {p.total_slots} slots</span>
            </div>
          </div>
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {amenities.slice(0,3).map(a => (
              <span key={a} className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-medium">{a}</span>
            ))}
            {amenities.length > 3 && <span className="text-[10px] text-gray-400">+{amenities.length-3}</span>}
          </div>
        )}

        {/* Description */}
        {p.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-4 flex-1">{p.description}</p>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
          <div>
            <span className="text-xl font-extrabold text-indigo-600">{formatCurrency(p.hourly_rate)}</span>
            <span className="text-xs text-gray-400">/hr</span>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${isFull ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white group-hover:bg-indigo-700'}`}>
            {isFull ? 'Full' : 'View & Book'}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function ParkingSearchPage() {
  const [params, setParams] = useSearchParams();
  const [parkings, setParkings] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState(params.get('search') || '');
  const [view,     setView]     = useState('list');
  const [onlyAvail, setOnlyAvail] = useState(false);
  const [maxRate,   setMaxRate]   = useState('');

  const fetchParkings = async (q='') => {
    setLoading(true);
    try {
      const { data } = await parkingService.getAll({ search: q });
      setParkings(data);
    } catch { toast.error('Failed to load parking locations.'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchParkings(params.get('search')||''); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setParams(search ? { search } : {});
    fetchParkings(search);
  };

  const filtered = parkings.filter(p => {
    if (onlyAvail && p.available_slots===0) return false;
    if (maxRate && parseFloat(p.hourly_rate) > parseFloat(maxRate)) return false;
    return true;
  });

  return (
    <DriverLayout
      title="Find Parking"
      subtitle="Search hundreds of available parking spots"
      action={
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex items-center gap-2 bg-white/90 rounded-xl px-3 py-2 shadow-md">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" placeholder="Location or name..."
              className="bg-transparent text-gray-800 placeholder-gray-400 outline-none text-sm w-40 sm:w-56"
              value={search} onChange={e=>setSearch(e.target.value)}/>
            {search && (
              <button type="button" onClick={()=>{setSearch('');fetchParkings('');}} className="text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            )}
          </div>
          <button type="submit" className="px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.3)' }}>
            Search
          </button>
        </form>
      }>

        {/* Filters + results */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            {/* Filter pills */}
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer select-none">
                <div onClick={()=>setOnlyAvail(v=>!v)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${onlyAvail?'bg-indigo-600':'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${onlyAvail?'translate-x-4':''}`}/>
                </div>
                Available only
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Max</span>
                <input type="number" placeholder="$/hr" min="0" value={maxRate}
                  onChange={e=>setMaxRate(e.target.value)}
                  className="w-20 px-2.5 py-1.5 text-sm rounded-xl border border-gray-200 bg-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"/>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-500">
                {loading ? 'Searching...' : `${filtered.length} location${filtered.length!==1?'s':''}`}
              </p>
              <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                {[['list','☰'],['map','🗺']].map(([v,icon])=>(
                  <button key={v} onClick={()=>setView(v)}
                    className={`px-3.5 py-2 text-sm transition-colors ${view===v?'bg-indigo-600 text-white':'text-gray-500 hover:bg-gray-50'}`}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><LoadingSpinner size="lg" text="Finding parking..."/></div>
          ) : view === 'map' ? (
            <MapComponent parkings={filtered} height="600px"/>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-gray-800">No parking found</p>
                <p className="text-sm text-gray-400 mt-1">Try a different search or adjust your filters</p>
              </div>
              <button onClick={()=>{setSearch('');setOnlyAvail(false);setMaxRate('');fetchParkings('');}}
                className="btn-secondary text-sm">Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(p => <ParkingCard key={p.id} p={p}/>)}
            </div>
          )}
        </div>
    </DriverLayout>
  );
}
