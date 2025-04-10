import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import * as turf from '@turf/turf';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export default function BoundaryUploadMapbox() {
  const [existingFields, setExistingFields] = useState([]);
  const [matchedFields, setMatchedFields] = useState([]);
  const [status, setStatus] = useState('');
  const mapRef = useRef(null);
  const previewLayer = useRef(null);

  useEffect(() => {
    const fetchFields = async () => {
      const snapshot = await getDocs(collection(db, 'fields'));
      const fields = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExistingFields(fields);
    };
    fetchFields();
  }, []);

  const initMap = () => {
    if (mapRef.current) return;

    const map = L.map('map', {
      center: [35, -91],
      zoom: 6,
      zoomControl: true,
    });

    mapRef.current = map;

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri',
      maxZoom: 22,
    }).addTo(map);
  };

  useEffect(() => {
    initMap();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('Reading file...');
    let features = [];

    try {
      if (file.name.endsWith('.zip')) {
        const arrayBuffer = await file.arrayBuffer();
        const geojson = await shp(arrayBuffer);
        features = Array.isArray(geojson) ? geojson : geojson.features;
      } else {
        const text = await file.text();
        const geojson = JSON.parse(text);
        features = Array.isArray(geojson) ? geojson : geojson.features;
      }

      const name = file.name.replace(/\.\w+$/, '').trim().toLowerCase();

      const matched = features.map((feature) => {
        const match = existingFields.find(
          (f) => f.fieldName.trim().toLowerCase() === name
        );
        return {
          name,
          geometry: feature.geometry,
          matchedField: match || null,
          selectedFieldId: match?.id || '',
        };
      });

      setMatchedFields(matched);
      setStatus('✅ Matched boundary. Ready to preview and save.');

      // auto-preview first one
      if (matched.length > 0 && matched[0].geometry) {
        previewGeometry(matched[0].geometry);
      }

    } catch (err) {
      console.error('File upload error:', err);
      setStatus('❌ Error reading file');
    }
  };

  const previewGeometry = (geometry) => {
    if (!mapRef.current || !geometry) return;

    const coords = geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
    if (previewLayer.current) {
      previewLayer.current.remove();
    }

    const layer = L.polygon(coords, { color: '#2563eb', fillOpacity: 0.4 }).addTo(mapRef.current);
    previewLayer.current = layer;
    mapRef.current.fitBounds(layer.getBounds(), { padding: [40, 40] });
  };

  const handleSave = async () => {
    try {
      for (const item of matchedFields) {
        if (!item.selectedFieldId) {
          alert('Please select a field for all boundary shapes.');
          return;
        }

        const geometry = item.geometry;
        if (!geometry) continue;

        const ref = doc(db, 'fields', item.selectedFieldId);
        const measured = turf.area(geometry) * 0.000247105;

        const updated = {
          boundary: {
            geojson: JSON.stringify(geometry), // ✅ Only geometry
            year: new Date().getFullYear(),
          },
          gpsAcres: parseFloat(measured.toFixed(1)),
        };

        await updateDoc(ref, updated);
      }

      setStatus('✅ Boundaries saved to matched fields.');
    } catch (err) {
      console.error('Failed to update field:', err);
      setStatus('❌ Error saving boundaries');
    }
  };

  const handleFieldChange = (i, id) => {
    const updated = [...matchedFields];
    updated[i].selectedFieldId = id;
    updated[i].matchedField = existingFields.find((f) => f.id === id);
    setMatchedFields(updated);
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Upload Field Boundaries (.zip or .geojson)</h1>
      <input type="file" accept=".zip,.geojson,.json" onChange={handleUpload} />
      <p className="text-sm mt-2 text-gray-600">{status}</p>

      <div id="map" className="w-full h-[400px] rounded border mt-4 mb-6" />

      {matchedFields.map((f, i) => (
        <div key={i} className="border rounded p-4 mb-3 bg-white shadow">
          <div className="text-sm font-semibold mb-1">{f.name}</div>
          <label className="text-xs block">Match to field:</label>
          <select
            value={f.selectedFieldId}
            onChange={(e) => handleFieldChange(i, e.target.value)}
            className="mt-1 border px-2 py-1 rounded w-full"
          >
            <option value="">Select field...</option>
            {existingFields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.fieldName} ({field.farmName})
              </option>
            ))}
          </select>
          <button
            onClick={() => previewGeometry(f.geometry)}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm"
          >
            Preview on Map
          </button>
        </div>
      ))}

      {matchedFields.length > 0 && (
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded mt-4 hover:bg-blue-700"
        >
          Save Boundaries
        </button>
      )}
    </div>
  );
}
