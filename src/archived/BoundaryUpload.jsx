// src/pages/BoundaryUpload.jsx
import React, { useState } from 'react';

import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import db from '../firebase';
import 'leaflet/dist/leaflet.css';

export default function BoundaryUpload() {
  const [uploadedFields, setUploadedFields] = useState([]);
  const [existingFields, setExistingFields] = useState([]);
  const [matchedFields, setMatchedFields] = useState([]);
  const [status, setStatus] = useState('');

  const handleShapefileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.name.endsWith('.zip')) return;

    setStatus('Reading shapefile...');
    const arrayBuffer = await file.arrayBuffer();
    const geojson = await shp(arrayBuffer);

    const uploaded = geojson.features.map((feature) => {
      const name = feature.properties.name || feature.properties.Name || feature.properties.NAME;
      return {
        name,
        geometry: feature.geometry
      };
    });
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
        match: match || null
      };
    });

    setMatchedFields(matches);
    setStatus('Matching complete. Ready to save.');
  };

  const handleSave = async () => {
    for (const item of matchedFields) {
      if (!item.match) continue;
      const ref = doc(db, 'fields', item.match.id);
      await updateDoc(ref, {
        boundary: {
          geojson: item.geometry,
          year: new Date().getFullYear()
        }
      });
    }
    setStatus('Boundaries saved!');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Upload Field Boundaries (Shapefile .zip)</h2>
      <input type="file" accept=".zip" onChange={handleShapefileUpload} className="mb-4" />
      {status && <p className="mb-4 text-sm text-gray-700">{status}</p>}

      {matchedFields.length > 0 && (
        <>
          <div className="mb-4">
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
            >
              Save Matched Boundaries
            </button>
          </div>
          <div className="space-y-6">
            {matchedFields.map((item, idx) => (
              <div key={idx} className="border rounded p-4 bg-white shadow">
                <p className="text-sm font-medium mb-2">
                  <strong>Uploaded Name:</strong> {item.name} <br />
                  <strong>Matched Field:</strong> {item.match?.fieldName || '— No Match —'}
                </p>
                {item.geometry && (
                  <MapContainer style={{ height: 200 }} bounds={[[0, 0], [0, 0]]} scrollWheelZoom={false}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <GeoJSON data={item.geometry} />
                  </MapContainer>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
