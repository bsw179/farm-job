// src/pages/BoundaryUpload.jsx
import React, { useState } from 'react';
import shp from 'shpjs';
import JSZip from 'jszip';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function BoundaryUpload() {
  const [status, setStatus] = useState('');
  const [uploadedFields, setUploadedFields] = useState([]);
  const [existingFields, setExistingFields] = useState([]);
  const [matchedFields, setMatchedFields] = useState([]);

  const measureArea = async (polygon) => {
    const turf = await import('@turf/turf');
    return turf.area(polygon) * 0.000247105; // m2 to acres
  };

  const handleShapefileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus('Reading shapefile...');
    let uploaded = [];

    try {
      let features = [];

      if (file.name.endsWith('.zip')) {
        const arrayBuffer = await file.arrayBuffer();
        const geojson = await shp(arrayBuffer);
        features = Array.isArray(geojson) ? geojson : geojson.features;
      } else if (file.name.endsWith('.json') || file.name.endsWith('.geojson')) {
        const text = await file.text();
        const geojson = JSON.parse(text);
        features = Array.isArray(geojson) ? geojson : geojson.features;
      }

      uploaded = features.map((feature) => {
        const name = feature.properties?.name || file.name.replace(/\.\w+$/, '');
        return {
          name,
          geometry: feature.geometry,
        };
      });

      setUploadedFields(uploaded);
      setStatus('Matching boundaries...');

      const snapshot = await getDocs(collection(db, 'fields'));
      const existing = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setExistingFields(existing);

      const matched = uploaded.map((upload) => {
        const match = existing.find((f) => f.fieldName.toLowerCase() === upload.name.toLowerCase());
        return match ? { ...upload, matchedField: match } : { ...upload, matchedField: null };
      });

      setMatchedFields(matched);
      setStatus('Matched boundaries to fields. Ready to save.');
    } catch (err) {
      console.error(err);
      setStatus('Error reading file.');
    }
  };

  const handleSave = async () => {
    try {
      for (const item of matchedFields) {
        if (!item.matchedField) continue;

        const ref = doc(db, 'fields', item.matchedField.id);
        const measured = await measureArea(item.geometry);
        const stored = item.matchedField.gpsAcres || 0;

        const shouldOverwrite = Math.abs(measured - stored) > 1 && window.confirm(
          `${item.matchedField.fieldName} — existing: ${stored.toFixed(1)} acres\n` +
          `measured: ${measured.toFixed(1)} acres\n\nOverwrite with measured value?`
        );

        const updated = {
          boundary: {
            geojson: item.geometry,
            year: new Date().getFullYear(),
          },
        };

        if (shouldOverwrite) {
          updated.gpsAcres = parseFloat(measured.toFixed(1));
        }

        await updateDoc(ref, updated);
      }

      setStatus('✅ Boundaries saved to matched fields.');
    } catch (err) {
      console.error('Failed to update field:', err);
      setStatus('❌ Error saving boundaries');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Upload Field Boundaries (.zip or .geojson)</h1>
      <input
        type="file"
        accept=".zip,.json,.geojson"
        onChange={handleShapefileUpload}
        className="mb-4"
      />

      {status && <div className="mb-4 text-sm text-gray-600">{status}</div>}

      {matchedFields.length > 0 && (
        <>
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-4 py-2 rounded shadow mb-6"
          >
            Save Boundaries
          </button>

          {matchedFields.map(({ name, geometry, matchedField }, i) => (
            <div key={i} className="bg-white rounded shadow p-4 mb-4">
              <h2 className="text-sm font-semibold mb-1">{name}</h2>
              <p className="text-xs mb-2 text-gray-600">
                Matched: {matchedField?.fieldName || '—'}
              </p>
              <div className="border rounded overflow-hidden">
                <MapContainer
                  style={{ height: 200 }}
                  bounds={[[0, 0], [0, 0]]}
                  scrollWheelZoom={true}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {geometry && <GeoJSON data={geometry} />}
                </MapContainer>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}