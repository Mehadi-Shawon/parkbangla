import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/helpers';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const dotIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25)"></div>`,
  iconSize: [16,16], iconAnchor: [8,8], popupAnchor: [0,-10],
});

const availColor = (p) => {
  const pct = p.total_slots > 0 ? p.available_slots / p.total_slots : 0;
  if (pct === 0) return '#ef4444';
  if (pct < 0.3) return '#f97316';
  if (pct < 0.6) return '#eab308';
  return '#22c55e';
};

export default function AdminMap() {
  const [parkings, setParkings]   = useState([]);
  const [filter,   setFilter]     = useState('all');
  const [loading,  setLoading]    = useState(true);
  const [selected, setSelected]   = useState(null);

  useEffect(() => {
    supabase.from('parking_locations')
      .select('*, owner:users!parking_locations_owner_id_fkey(name)')
      .then(({ data }) => setParkings(data || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = parkings.filter(p => {
    if (filter === 'all')      return true;
    if (filter === 'approved') return p.status === 'approved';
    if (filter === 'pending')  return p.status === 'pending';
    if (filter === 'full')     return p.available_slots === 0;
    return true;
  });

  const stats = {
    total:    parkings.length,
    approved: parkings.filter(p => p.status === 'approved').length,
    pending:  parkings.filter(p => p.status === 'pending').length,
    full:     parkings.filter(p => p.available_slots === 0 && p.status === 'approved').length,
  };

  const center = parkings.length
    ? [parseFloat(parkings[0].latitude), parseFloat(parkings[0].longitude)]
    : [40.7128, -74.0060];

  const FILTERS = [
    { key:'all',      label:`All (${stats.total})` },
    { key:'approved', label:`Active (${stats.approved})` },
    { key:'pending',  label:`Pending (${stats.pending})` },
    { key:'full',     label:`Full (${stats.full})` },
  ];

  const Legend = () => (
    <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-xl border border-gray-100 shadow-lg p-3 text-xs">
      {[['#22c55e','Available'],['#eab308','Low (<60%)'],['#f97316','Critical (<30%)'],['#ef4444','Full']].map(([c,l]) => (
        <div key={l} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background:c }}/>
          <span className="text-gray-600">{l}</span>
        </div>
      ))}
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        <AdminPageHeader
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>}
          label="Admin" title="Parking Map"
          subtitle="Geographic overview of all locations"
          color="#10b981"
        />

        {/* Stats + filters row */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filter===f.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-200'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">{filtered.length} location{filtered.length!==1?'s':''} shown</p>
        </div>

        {/* Map */}
        <div className="admin-card rounded-2xl overflow-hidden" style={{ height: 540 }}>
          {loading ? (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/>
            </div>
          ) : (
            <div className="relative h-full">
              <MapContainer center={center} zoom={12} style={{ width:'100%', height:'100%' }} scrollWheelZoom>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                {filtered.map(p => (
                  <Marker key={p.id}
                    position={[parseFloat(p.latitude), parseFloat(p.longitude)]}
                    icon={dotIcon(availColor(p))}
                    eventHandlers={{ click: () => setSelected(p) }}>
                    <Popup minWidth={200}>
                      <div className="text-xs">
                        <p className="font-bold text-gray-900 text-sm mb-1">{p.name}</p>
                        <p className="text-gray-500 mb-2">{p.address}</p>
                        <div className="grid grid-cols-2 gap-1 mb-2">
                          <span className="text-gray-500">Slots</span>
                          <span className="font-semibold text-gray-800">{p.available_slots}/{p.total_slots}</span>
                          <span className="text-gray-500">Rate</span>
                          <span className="font-semibold text-gray-800">{formatCurrency(p.hourly_rate)}/hr</span>
                          <span className="text-gray-500">Status</span>
                          <span className={`font-semibold capitalize ${p.status==='approved'?'text-green-600':'text-amber-600'}`}>{p.status}</span>
                        </div>
                        <Link to="/admin/parking" className="block text-center text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg py-1.5 transition-colors">
                          Manage
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
              <Legend />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
