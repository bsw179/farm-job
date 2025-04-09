import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import shp from 'shpjs';
import * as turf from '@turf/turf';
import { doc, getDoc, updateDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../firebase';


export default function FieldBoundaryEditor() {
  const { fieldId } = useParams();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const drawnLayerRef = useRef(null);
  const [field, setField] = useState(null);
  const [acres, setAcres] = useState(0);
  const fileInputRef = useRef(null);

  const initMap = async (fieldData) => {
  if (mapRef.current) {
    mapRef.current.remove();
  }

  let parsedGeoJSON = null;
  try {
    const raw = fieldData.boundary?.geojson;
let result = raw;
if (typeof raw === 'string') {
  try {
    result = JSON.parse(raw);
  } catch (err) {
    console.warn('❌ Failed to parse raw:', raw);
    result = null;
  }
}
    parsedGeoJSON = parsed?.type === 'Feature' && parsed.geometry ? parsed.geometry : parsed;
  } catch (err) {
    console.warn('Failed to parse geojson:', err);
  }

  const map = L.map('map', {
    center: [35, -91],
    zoom: 17,
    zoomControl: true,
  });
  mapRef.current = map;

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri',
    maxZoom: 22,
  }).addTo(map);

  map.pm.addControls({
    position: 'topleft',
    drawMarker: false,
    drawPolyline: false,
    drawCircle: false,
    drawRectangle: false,
    drawCircleMarker: false,
  });

  map.pm.setPathOptions({
    color: '#2563eb',
    fillOpacity: 0.4,
    hintlineStyle: { color: 'blue', dashArray: [5, 5] },
    templineStyle: { color: 'blue' },
  });

  // 🧱 Add background reference boundaries from other fields
  try {
  const colRef = collection(db, 'fields');
  const snapshot = await getDocs(colRef);

  if (!snapshot?.docs?.length) {
    console.warn('No field documents returned');
    return;
  }

  const others = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((f) => f.id !== fieldId && f.boundary?.geojson);

  others.forEach((f) => {
    let geo = f.boundary.geojson;
    try {
if (typeof geo === 'string') {
  try {
    geo = JSON.parse(geo);
  } catch (err) {
    console.warn('❌ Invalid geo JSON:', geo);
    geo = null;
  }
}
      if (geo.type === 'Feature') geo = geo.geometry;
    } catch {
      return;
    }

    if (geo?.type === 'Polygon') {
      const coords = geo.coordinates[0].map(([lng, lat]) => [lat, lng]);
      L.polygon(coords, {
        fillColor: '#cccccc',
        fillOpacity: 0.3,
        weight: 1,
        color: '#666',
        interactive: false,
      }).addTo(mapRef.current);
    }
  });

} catch (err) {
  console.error('Error fetching field boundaries:', err);
}


  map.on('pm:create', (e) => {
    if (drawnLayerRef.current) {
      map.removeLayer(drawnLayerRef.current);
    }
    const layer = e.layer;
    drawnLayerRef.current = layer;
    layer.addTo(map);
    layer.pm.enable({ allowSelfIntersection: false });

    const geo = layer.toGeoJSON();
    const area = turf.area(geo);
    setAcres((area / 4046.86).toFixed(2));
  });

  if (parsedGeoJSON && parsedGeoJSON.type === 'Polygon' && Array.isArray(parsedGeoJSON.coordinates)) {
    const coords = parsedGeoJSON.coordinates[0].map(([lng, lat]) => [lat, lng]);
    const polygon = L.polygon(coords, { color: '#2563eb', fillOpacity: 0.4 }).addTo(map);
    drawnLayerRef.current = polygon;
    polygon.pm.enable({ allowSelfIntersection: false });

    map.fitBounds(polygon.getBounds(), { padding: [20, 20] });

    const area = turf.area(parsedGeoJSON);
    setAcres((area / 4046.86).toFixed(2));

    polygon.on('pm:edit', () => {
      const geo = polygon.toGeoJSON();
      const newArea = turf.area(geo);
      setAcres((newArea / 4046.86).toFixed(2));
    });
  }
};


  useEffect(() => {
    const loadFieldAndMap = async () => {
      const docRef = doc(db, 'fields', fieldId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        alert('Field not found.');
        return;
      }
      const fieldData = docSnap.data();
      setField(fieldData);

      setTimeout(() => initMap(fieldData), 0);
    };

    loadFieldAndMap();
  }, [fieldId]);

  const handleSave = async () => {
    if (!drawnLayerRef.current) return alert('Draw or import a boundary first.');
    const geo = drawnLayerRef.current.toGeoJSON();
    const area = turf.area(geo);

    const update = {
      boundary: {
        geojson: JSON.stringify(geo.geometry),
        year: new Date().getFullYear(),
      },
      gpsAcres: parseFloat((area / 4046.86).toFixed(2)),
    };

    const docRef = doc(db, 'fields', fieldId);
    await updateDoc(docRef, update);
    alert('Boundary saved!');
    navigate(-1);
  };

  const handleClear = () => {
    if (drawnLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(drawnLayerRef.current);
      drawnLayerRef.current = null;
      setAcres(0);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    let geometry = null;

    try {
      if (file.name.endsWith('.zip')) {
        const arrayBuffer = await file.arrayBuffer();
        const geojson = await shp(arrayBuffer);
        const feature = Array.isArray(geojson) ? geojson[0] : geojson.features[0];
        geometry = feature.geometry;
      } else {
        const text = await file.text();
let parsed = null;
try {
  parsed = JSON.parse(text);
} catch (err) {
  console.warn('❌ Failed to parse text:', text);
  // Leave parsed as null — your app logic can decide how to handle it
}
        const feature = Array.isArray(parsed.features) ? parsed.features[0] : parsed;
        geometry = feature.geometry || parsed.geometry;
      }

      if (!geometry || geometry.type !== 'Polygon') throw new Error('Invalid geometry');

      if (drawnLayerRef.current) {
        mapRef.current.removeLayer(drawnLayerRef.current);
      }

      const coords = geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
      const polygon = L.polygon(coords, { color: '#2563eb', fillOpacity: 0.4 }).addTo(mapRef.current);
      drawnLayerRef.current = polygon;
      polygon.pm.enable({ allowSelfIntersection: false });

      mapRef.current.fitBounds(polygon.getBounds(), { padding: [20, 20] });

      const area = turf.area(geometry);
      setAcres((area / 4046.86).toFixed(2));

      polygon.on('pm:edit', () => {
        const geo = polygon.toGeoJSON();
        const newArea = turf.area(geo);
        setAcres((newArea / 4046.86).toFixed(2));
      });

    } catch (err) {
      console.error('Error importing file:', err);
      alert('Failed to load boundary from file.');
    }
  };

  if (!field) return <div className="p-6">Loading field...</div>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Edit Boundary – {field.fieldName}</h2>

      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,.geojson,.json"
        onChange={handleFileUpload}
        className="mb-4 block"
      />

      <div id="map" className="w-full h-[500px] rounded border mb-4" />

      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-gray-700">Acres: {acres}</span>
        <div className="flex gap-2">
          <button onClick={handleClear} className="px-4 py-2 bg-red-600 text-white rounded">
            Clear Map
          </button>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-500 text-white rounded">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">
            Save Boundary
          </button>
        </div>
      </div>
    </div>
  );
}
