// src/pages/BoundaryUpload.jsx
import React, { useState } from 'react';

import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { db } from '../firebase';
import 'leaflet/dist/leaflet.css';
import handleBoundaryUpload from './handleBoundaryUpload';

export default function BoundaryUpload() {
  const [uploadedFields, setUploadedFields] = useState([]);
  const [existingFields, setExistingFields] = useState([]);
  const [matchedFields, setMatchedFields] = useState([]);
  const [status, setStatus] = useState('');

  const handleShapefileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('Reading file...');

    let uploaded = [];

    if (file.name.endsWith('.zip')) {
      const arrayBuffer = await file.arrayBuffer();
      const geojson = await shp(arrayBuffer);
      uploaded = geojson.features.map((feature) => {
        const name = feature.properties.name || feature.properties.Name || 'Unnamed';
        return { name, geometry: feature.geometry };
      });
    } else if (file.name.endsWith('.json') || file.name.endsWith('.geojson')) {
      const text = await file.text();
      const geojson = JSON.parse(text);
      uploaded = geojson.features.map((feature) => {
        const name = feature.properties.name || feature.properties.Name || 'Unnamed';
        return { name, geometry: feature.geometry };
      });
    } else {
      setStatus('❌ Unsupported file type');
      return;
    }

    setUploadedFields(uploaded);

    setStatus('Fetching existing fields...');
    const snapshot = await getDocs(collection(db, 'fields'));
    const existing = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setExistingFields(existing);

    const matches = uploaded.map((shape) => {
      const match = existing.find((field) =>
        field.fieldName.toLowerCase().includes(shape.name.toLowerCase()) ||
        shape.name.toLowerCase().includes(field.fieldName.toLowerCase())
      );
      return {
        name: shape.name,
        geometry: shape.geometry,
        matchedField: match || null,
      };
    });

    setMatchedFields(matches);
    setStatus('Matched boundaries to fields. Ready to save.');
  };

  const handleSave = async () => {
    for (const { name, geometry, matchedField } of matchedFields) {
      if (!matchedField) continue;
      const ref = doc(db, 'fields', matchedField.id);
      const cropYear = new Date().getFullYear();
      await handleBoundaryUpload({ ref, matchedField, geometry, cropYear });
    }
    setStatus('✅ Boundaries saved to matched fields.');
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Upload Field Boundaries (.zip or .geojson)</h1>
      <input type="file" accept=".zip,.json,.geojson" onChange={handleShapefileUpload} className="mb-4" />
      {status && <div className="mb-4 text-sm text-gray-600">{status}</div>}
      <button
        onClick={handleSave}
        className="px-4 py-2 bg-blue-600 text-white rounded shadow"
        disabled={matchedFields.length === 0}
      >
        Save Boundaries
      </button>
      <div className="grid grid-cols-2 gap-4 mt-6">
        {matchedFields.map(({ name, geometry, matchedField }) => (
          <div key={name} className="border p-3 rounded bg-white shadow text-sm">
            <h2 className="font-bold mb-2">{name}</h2>
            <p className="text-gray-600">Matched: {matchedField?.fieldName || '—'}</p>
            {geometry && (
              <MapContainer style={{ height: 200 }} bounds={[[0, 0], [0, 0]]} scrollWheelZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <GeoJSON data={geometry} />
              </MapContainer>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
