// src/pages/EditJobPolygon.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import * as turf from '@turf/turf';

export default function EditJobPolygon() {
  const navigate = useNavigate();
  const { fieldId } = useParams();
  const location = useLocation();
  const field = location.state?.field;
  const [drawnPolygon, setDrawnPolygon] = useState(null);
  const [drawnAcres, setDrawnAcres] = useState(null);

  useEffect(() => {
    let geo = field?.boundary?.geojson || field?.boundary;
if (!geo) return;


    // Clear any existing map instance
    if (window._leaflet_map) {
      window._leaflet_map.remove();
      delete window._leaflet_map;
    }

    const map = L.map('map', {
      center: [35, -91],
      zoom: 17,
      zoomControl: true,
    });
    window._leaflet_map = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Tiles © Esri',
      maxZoom: 22,
    }).addTo(map);

    
    try {
      if (typeof geo === 'string') geo = JSON.parse(geo);
    } catch (err) {
      console.warn('Invalid GeoJSON string:', err);
      geo = null;
    }



    if (geo?.type === 'Feature') geo = geo.geometry;

    if (geo?.type === 'Polygon' && Array.isArray(geo.coordinates)) {
      const coords = geo.coordinates[0].map(([lng, lat]) => [lat, lng]);
      const polygon = L.polygon(coords, {
        color: 'gray',
        weight: 1,
        fillOpacity: 0.2,
        interactive: false,
      }).addTo(map);

      map.fitBounds(polygon.getBounds(), { padding: [20, 20] });
      // 🟦 Draw existing drawnPolygon if present
if (location.state?.drawnPolygon) {
  let overlay = location.state.drawnPolygon;
  if (typeof overlay === 'string') {
    try {
      overlay = JSON.parse(overlay);
    } catch {
      overlay = null;
    }
  }

  if (overlay?.geometry?.type === 'Polygon') {
    const overlayCoords = overlay.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
    const overlayLayer = L.polygon(overlayCoords, {
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.2
    }).addTo(map);

    setDrawnPolygon(overlay);
    const acres = turf.area(overlay) * 0.000247105;
    setDrawnAcres(acres.toFixed(2));
  }
}

    }

    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawPolyline: false,
      drawCircle: false,
      drawRectangle: false,
      drawCircleMarker: false,
    });

    const drawnLayerRef = { current: null };

    map.on('pm:create', (e) => {
      if (drawnLayerRef.current) {
        map.removeLayer(drawnLayerRef.current);
      }

      const geo = e.layer.toGeoJSON();
      const acres = turf.area(geo) * 0.000247105;

      drawnLayerRef.current = e.layer;
      map.addLayer(e.layer);
      setDrawnPolygon(geo);
      setDrawnAcres(acres.toFixed(2));
    });

    map.on('pm:remove', () => {
      if (drawnLayerRef.current) {
        map.removeLayer(drawnLayerRef.current);
        drawnLayerRef.current = null;
      }
      setDrawnPolygon(null);
      setDrawnAcres(null);
    });
  }, [field]);

const handleSave = async () => {
  const updatedField = {
    ...field,
    drawnPolygon: JSON.stringify(drawnPolygon),
    drawnAcres: parseFloat(drawnAcres)
  };

  const previousState = location.state || {};
  const selectedFields = previousState.selectedFields?.map(f =>
    f.id === updatedField.id ? updatedField : f
  ) || [updatedField];

  const linkedToJobId = location.state?.linkedToJobId;

  // ✅ Update the master job (if needed)
  if (linkedToJobId) {
    const masterRef = doc(db, 'jobs', linkedToJobId);
    const masterSnap = await getDoc(masterRef);
    if (masterSnap.exists()) {
      const masterData = masterSnap.data();

      const updatedFields = (masterData.fields || []).map(f =>
        f.id === updatedField.id
          ? {
              ...f,
              drawnPolygon: updatedField.drawnPolygon,
              drawnAcres: updatedField.drawnAcres,
              acres: updatedField.drawnAcres
            }
          : f
      );

      await setDoc(masterRef, {
        ...masterData,
        fields: updatedFields,
        acres: {
          ...masterData.acres,
          [updatedField.id]: updatedField.drawnAcres
        }
      });
    }

    // ✅ ALSO update jobsByField for field-specific summary
    console.log('🧠 About to update jobsByField:', `${linkedToJobId}_${field.id}`);

    const jobByFieldRef = doc(db, 'jobsByField', `${linkedToJobId}_${field.id}`);
    await updateDoc(jobByFieldRef, {
      drawnPolygon: JSON.stringify(drawnPolygon),
      drawnAcres: parseFloat(drawnAcres),
      acres: parseFloat(drawnAcres)
    });
  }

  navigate('/jobs/summary', {
    state: {
      ...previousState,
      selectedFields,
      updatedField,
    },
  });
};


  if (!field) {
    return <div className="p-6">No field data found.</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Draw Job Area – {field.fieldName}</h2>

      <div id="map" className="w-full h-[500px] rounded border mb-4" />

      <p className="text-sm text-gray-600 mb-4">
        📐 {drawnAcres ? `${drawnAcres} acres` : 'No area drawn yet'}
      </p>

      <div className="flex gap-4">
        <button
          onClick={() => navigate('/jobs/summary', { state: location.state })}
          className="px-4 py-2 border rounded"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Save Area
        </button>
      </div>
    </div>
  );
}
