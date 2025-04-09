// src/pages/BoundaryUpload.jsx
import React, { useState } from 'react';
import shp from 'shpjs';
import JSZip from 'jszip';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

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
        return {
          ...upload,
          matchedField: match,
          selectedFieldId: match?.id || '',
        };
      });

      setMatchedFields(matched);
      setStatus('Matched boundaries to fields. Ready to save.');
    } catch (err) {
      console.error(err);
      setStatus('Error reading file.');
    }
  };

  const handleFieldChange = (index, newId) => {
    const field = existingFields.find((f) => f.id === newId);
    const updated = [...matchedFields];
    updated[index].matchedField = field;
    updated[index].selectedFieldId = newId;
    setMatchedFields(updated);
  };

  const handleSave = async () => {
    try {
      for (const item of matchedFields) {
        if (!item.selectedFieldId) {
          alert('Please select a field for all boundary shapes.');
          return;
        }

        const ref = doc(db, 'fields', item.selectedFieldId);
        const measured = await measureArea(item.geometry);
        const stored = item.matchedField?.gpsAcres || 0;

        const shouldOverwrite = Math.abs(measured - stored) > 1 && window.confirm(
          `${item.name} — existing: ${stored.toFixed(1)} acres\n` +
          `measured: ${measured.toFixed(1)} acres\n\nOverwrite GPS acres with measured value?`
        );

        const updated = {
          boundary: {
            geojson: JSON.stringify(item.geometry),
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

  const renderBoundarySVG = (geometry) => {
    if (!geometry || geometry.type !== 'Polygon') return null;
    const coords = geometry.coordinates[0];
    const bounds = coords.reduce((acc, [lng, lat]) => {
      return {
        minX: Math.min(acc.minX, lng),
        maxX: Math.max(acc.maxX, lng),
        minY: Math.min(acc.minY, lat),
        maxY: Math.max(acc.maxY, lat),
      };
    }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const scaleX = 300 / width;
    const scaleY = 300 / height;
    const scale = Math.min(scaleX, scaleY);

    const path = coords.map(([lng, lat], i) => {
      const x = (lng - bounds.minX) * scale;
      const y = 300 - (lat - bounds.minY) * scale;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ') + ' Z';

    return (
      <svg viewBox="0 0 300 300" className="w-full h-64 border rounded bg-gray-100">
        <path d={path} fill="none" stroke="#1e40af" strokeWidth="2" />
      </svg>
    );
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
           disabled={matchedFields.some(f => !f.selectedFieldId)}
           className={`px-4 py-2 rounded shadow mb-6 ${
            matchedFields.some(f => !f.selectedFieldId)
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
         }`}
        >
          Save Boundaries
        </button>

          {matchedFields.map(({ name, geometry, matchedField, selectedFieldId }, i) => (
            <div key={i} className="bg-white rounded shadow p-4 mb-4">
              <h2 className="text-sm font-semibold mb-1">{name}</h2>
              <label className="block text-xs font-medium text-gray-600 mb-1">Matched Field:</label>
              <select
                value={selectedFieldId}
                onChange={(e) => handleFieldChange(i, e.target.value)}
                className="border px-2 py-1 rounded mb-2"
              >
                <option value="">Select field...</option>
                {existingFields.map((f) => (
                  <option key={f.id} value={f.id}>{f.fieldName} ({f.farmName})</option>
                ))}
              </select>
              <div className="border rounded overflow-hidden">
                {geometry && renderBoundarySVG(geometry)}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
