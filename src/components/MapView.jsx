import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Leaflet looks for its marker pictures by a path that bundlers break, so they are set here.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

// Moves the map when the pin moves (for example after the host picks a destination or searches an address).
function Follow({ lat, lng }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [map, lat, lng]);
  return null;
}

function Picker({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

// Free OpenStreetMap map (Leaflet), no API key. With `onPick`, a click on the map moves the pin.
// The wrapper has its own stacking level so the map never covers the header or dialogs.
export default function MapView({ lat, lng, onPick, height = 280 }) {
  return (
    <div style={{ height, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", position: "relative", zIndex: 0 }}>
      <MapContainer center={[lat, lng]} zoom={14} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} />
        <Follow lat={lat} lng={lng} />
        {onPick && <Picker onPick={onPick} />}
      </MapContainer>
    </div>
  );
}
