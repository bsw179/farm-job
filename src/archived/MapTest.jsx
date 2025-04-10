import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function MapTest() {
  return (
    <div style={{ height: '100vh' }}>
      <MapContainer center={[35.5, -91]} zoom={14} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://api.mapbox.com/styles/v1/chadgpt/cluz9t9oi00xl01pk0tacb90f/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY2hhdGdwdGRldiIsImEiOiJjbG9uc2MwbmMwZ3VuM3VxanM2eG9hZnlzIn0.R4BffWjps8eERkhAbLBIKw"
          attribution="© Mapbox"
          tileSize={256}
          zoomOffset={0}
        />
      </MapContainer>
    </div>
  );
}
