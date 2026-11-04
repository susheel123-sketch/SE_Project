import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { photoUrl } from './api';

// Fix Leaflet's default marker images when bundled by Vite.
L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow,
  iconSize: [25, 41], iconAnchor: [12, 41],
});

export function Field({ label, error, hint, children }) {
  return (
    <label className={`field${error ? ' has-error' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="error-text" role="alert">{error}</span>}
    </label>
  );
}

export const Alert = ({ kind = 'error', children }) => (children ? <div className={`alert ${kind}`} role="status">{children}</div> : null);

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

// Shows a request photo (needs the login token, so it is fetched as a blob).
export function AuthImage({ photoId, alt }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let url;
    let live = true;
    photoUrl(photoId).then((u) => { url = u; if (live) setSrc(u); }).catch(() => {});
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [photoId]);
  return src ? <img src={src} alt={alt} className="thumb" /> : <div className="thumb thumb-empty" />;
}

function ClickToPick({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// Click on the map to set the shop's location. Defaults to central Karachi.
export function MapPicker({ lat, lng, onPick }) {
  const has = lat !== '' && lng !== '' && lat != null && lng != null;
  const center = has ? [Number(lat), Number(lng)] : [24.8607, 67.0011];
  return (
    <MapContainer center={center} zoom={has ? 15 : 12} className="map" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickToPick onPick={onPick} />
      {has && <Marker position={[Number(lat), Number(lng)]} />}
    </MapContainer>
  );
}

export function MapView({ lat, lng }) {
  return (
    <MapContainer center={[lat, lng]} zoom={15} className="map map-small" scrollWheelZoom={false}>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[lat, lng]} />
    </MapContainer>
  );
}

export const pkr = (n) => `Rs ${Number(n).toLocaleString('en-PK')}`;
