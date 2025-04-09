// src/pages/MapCreator.jsx
import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  LayersControl,
  GeoJSON,
  ScaleControl,
} from 'react-leaflet';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import 'leaflet/dist/leaflet.css';

const { BaseLayer } = LayersControl;

export default function MapCreator() {
  const [boundaries, setBoundaries] = useState([]);

  useEffect(() => {
    const fetchBoundaries = async () => {
      const snapshot = await getDocs(collection(db, 'fields'));
      const shapes = snapshot.docs.map((doc) => {
        const raw = doc.data().boundary?.geojson;
        try {
          const geo = typeof raw === 'string' ? JSON.parse(raw) : raw;
          return geo ? { geometry: geo, field: doc.data() } : null;
        } catch {
          return null;
        }
      }).filter(Boolean);
      setBoundaries(shapes);
    };
    fetchBoundaries();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">🗺️ Map Creator / Viewer</h2>

      <div className="h-[80vh] rounded border overflow-hidden">
        <MapContainer center={[35, -91]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <LayersControl position="topright">
            <BaseLayer checked name="Satellite">
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Tiles © Esri"
              />
            </BaseLayer>
            <BaseLayer name="Streets">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
            </BaseLayer>
          </LayersControl>

          {boundaries.map(({ geometry, field }, idx) => (
            <GeoJSON
              key={idx}
              data={{ type: 'Feature', geometry }}
              style={{ color: '#1d4ed8', weight: 2 }}
              onEachFeature={(feature, layer) => {
                layer.bindTooltip(`${field.fieldName} (${field.crops?.[new Date().getFullYear()]?.crop || 'No crop'})`, {
                  permanent: true,
                  direction: 'center',
                  className: 'bg-white text-xs rounded shadow p-1'
                });
              }}
            />
          ))}

          <ScaleControl position="bottomleft" />
        </MapContainer>
      </div>
    </div>
  );
}
