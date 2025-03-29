import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function MapViewer() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Map Viewer</h2>
      <MapContainer
        center={[34.789, -91.687]} // Center on AR/MS Delta
        zoom={10}
        scrollWheelZoom={true}
        style={{ height: '600px', width: '100%', borderRadius: '0.5rem' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
    </div>
  );
}
