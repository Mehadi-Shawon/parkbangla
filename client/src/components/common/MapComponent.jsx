import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';

// Fix broken default marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const colorDot = (p) => {
  const pct = p.available_slots / Math.max(p.total_slots, 1);
  if (pct === 0)   return '#ef4444';
  if (pct < 0.25)  return '#f97316';
  if (pct < 0.5)   return '#eab308';
  return '#22c55e';
};

const dotIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
  iconSize:   [18, 18],
  iconAnchor: [9, 9],
  popupAnchor:[0, -12],
});

const DEFAULT = [40.7128, -74.0060];

export default function MapComponent({ parkings = [], center, zoom = 13, height = '500px' }) {
  const pos = center
    ? [parseFloat(center.lat), parseFloat(center.lng)]
    : parkings.length
      ? [parseFloat(parkings[0].latitude), parseFloat(parkings[0].longitude)]
      : DEFAULT;

  return (
    <div style={{ height, position: 'relative', zIndex: 0 }} className="rounded-2xl overflow-hidden shadow-lg">
      <MapContainer
        center={pos}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {parkings.map(p => (
          <Marker
            key={p.id}
            position={[parseFloat(p.latitude), parseFloat(p.longitude)]}
            icon={dotIcon(colorDot(p))}
          >
            <Popup minWidth={180}>
              <p style={{ fontWeight: 700, marginBottom: 4 }}>{p.name}</p>
              <p style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>{p.address}</p>
              <p style={{ fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: p.available_slots === 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                  {p.available_slots}/{p.total_slots} slots
                </span>
                &nbsp;·&nbsp;${p.hourly_rate}/hr
              </p>
              <Link to={`/parking/${p.id}`}
                style={{ display:'block', textAlign:'center', background:'#2563eb', color:'#fff', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, textDecoration:'none' }}>
                View Details
              </Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
