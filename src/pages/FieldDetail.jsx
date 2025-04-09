// src/pages/FieldDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useCropYear } from '../context/CropYearContext';
import area from '@turf/area';

export default function FieldDetail() {
  const { fieldId } = useParams();
  const navigate = useNavigate();
  const { cropYear, setCropYear } = useCropYear();

  const [field, setField] = useState(null);
  const [updatedField, setUpdatedField] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [fieldJobs, setFieldJobs] = useState([]);
  const [cropOptions, setCropOptions] = useState([]);


 useEffect(() => {
  const fetchData = async () => {
    const ref = doc(db, 'fields', fieldId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() };
      if (typeof data.boundary?.geojson === 'string') {
        try {
          data.boundary.geojson = JSON.parse(data.boundary.geojson);
        } catch {
          console.warn('Failed to parse boundary GeoJSON');
        }
      }
      setField(data);
      setUpdatedField(data);

      // 🧠 Add boundary preview map if boundary exists
     setTimeout(() => {
  if (!data.boundary?.geojson || typeof window.L === 'undefined') return;

  const raw = data.boundary.geojson;
  const geo = raw.type === 'Feature' && raw.geometry ? raw.geometry : raw;
  if (geo?.type !== 'Polygon') return;

  const coords = geo.coordinates[0].map(([lng, lat]) => [lat, lng]);

  // 🧼 DROP THIS RIGHT HERE:
  const existing = L.DomUtil.get('boundary-preview-map');
  if (existing && existing._leaflet_id) {
    existing._leaflet_id = null;
  }

  const map = L.map('boundary-preview-map', {
    attributionControl: false,
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
  });

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri',
    maxZoom: 22,
  }).addTo(map);

  const polygon = L.polygon(coords, { color: '#2563eb', fillOpacity: 0.4 }).addTo(map);
  map.fitBounds(polygon.getBounds(), { padding: [10, 10] });
}, 0);

    }
  };

  fetchData();
}, [fieldId]);


  useEffect(() => {
    const fetchFieldJobs = async () => {
      const q = query(collection(db, 'jobsByField'), where('fieldId', '==', fieldId));
      const snap = await getDocs(q);
      const jobs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFieldJobs(jobs);
    };
    fetchFieldJobs();
  }, [fieldId]);

  useEffect(() => {
    const fetchCropTypes = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'cropTypes'));
        const crops = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('Fetched crops:', crops); // <-- Add this
        setCropOptions(crops.filter(c => c.isRealCrop !== false));
      } catch (error) {
        
      }
    };
  
    fetchCropTypes();
  }, []);
  
  

  const handleUpdate = async () => {
    const ref = doc(db, 'fields', fieldId);
    const clean = { ...updatedField };
    if (clean.boundary?.geojson) delete clean.boundary.geojson;
    await updateDoc(ref, clean);
    const updatedSnap = await getDoc(ref);
    const updatedData = { id: fieldId, ...updatedSnap.data() };
    setField(updatedData);
    setUpdatedField(updatedData);
    setEditMode(false);
  };

  const handleCancel = () => {
    setUpdatedField(field);
    setEditMode(false);
  };

  const crop = field?.crops?.[cropYear]?.crop || '';
  const variety = field?.crops?.[cropYear]?.variety || '';

  const gpsAcresFromBoundary = field?.boundary?.geojson
    ? (area(field.boundary.geojson) * 0.000247105).toFixed(2)
    : field?.gpsAcres || '—';

  const fieldOrder = [
    ['fieldName', 'Field Name'],
    ['farmName', 'Farm Name'],
    ['gpsAcres', `GPS Acres${field?.boundary?.geojson ? ' (from boundary)' : ''}`],
    ['fsaAcres', 'FSA Acres'],
    ['county', 'County'],
    ['farmNumber', 'Farm Number'],
    ['tractNumber', 'Tract Number'],
    ['fsaFieldNumber', 'FSA Field Number'],
    ['operator', 'Operator'],
    ['operatorExpenseShare', 'Operator Expense %'],
    ['operatorRentShare', 'Operator Rent %'],
    ['landowner', 'Landowner'],
    ['landownerExpenseShare', 'Landowner Expense %'],
    ['landownerRentShare', 'Landowner Rent %']
  ];

  const renderBoundarySVG = (geometry) => {
    if (!geometry || geometry.type !== 'Polygon') return null;
    const coords = geometry.coordinates[0];
    const bounds = coords.reduce((acc, [lng, lat]) => ({
      minX: Math.min(acc.minX, lng),
      maxX: Math.max(acc.maxX, lng),
      minY: Math.min(acc.minY, lat),
      maxY: Math.max(acc.maxY, lat)
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const scale = Math.min(300 / width, 300 / height);

    const path = coords.map(([lng, lat], i) => {
      const x = (lng - bounds.minX) * scale;
      const y = 300 - (lat - bounds.minY) * scale;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ') + ' Z';

  

return (
  <div>
    <h1>Field Details</h1>
    ...
  </div>
);

    return (
      <svg viewBox="0 0 300 300" className="w-full h-64 border rounded bg-gray-100">
        <path d={path} fill="none" stroke="#1e40af" strokeWidth="2" />
      </svg>
    );
  };

  if (!field) return <div className="p-6">Loading field...</div>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between mb-6">
        <h2 className="text-xl font-bold">{field.fieldName} – Field Details</h2>
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => setCropYear(c => c - 1)} className="text-blue-600 font-bold">⬅</button>
          <span className="font-semibold text-gray-700">{cropYear}</span>
          <button onClick={() => setCropYear(c => c + 1)} className="text-blue-600 font-bold">➡</button>
        </div>
      </div>

      {/* Field Info */}
      <div className="grid grid-cols-2 gap-2 mb-6 text-sm">
        {fieldOrder.map(([key, label]) => (
          <div key={key} className="bg-white p-3 rounded shadow">
            <label className="block text-xs text-gray-500 mb-1">{label}</label>
            {editMode ? (
              <input
                className="border p-2 rounded w-full"
                value={updatedField[key] || ''}
                onChange={(e) => setUpdatedField({ ...updatedField, [key]: e.target.value })}
              />
            ) : (
              <div className="font-medium">{key === 'gpsAcres' ? gpsAcresFromBoundary : field[key] || '—'}</div>
            )}
          </div>
        ))}
      </div>

      {/* Crop Info */}
      <div className="bg-white p-4 rounded shadow col-span-2 mb-6">
        <h3 className="text-sm font-semibold mb-2 text-gray-700">🌱 Crop Assignment – {cropYear}</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {editMode ? (
            <>
             {/* Crop dropdown */}
<select
  value={updatedField.crops?.[cropYear]?.crop || ''}
  onChange={(e) => {
    setUpdatedField((prev) => ({
      ...prev,
      crops: {
        ...prev.crops,
        [cropYear]: {
          ...prev.crops?.[cropYear],
          crop: e.target.value,
          riceType: '', // clear riceType if changing crops
        },
      },
    }));
  }}
  className="border p-2 rounded"
>
  <option value="">Select Crop</option>
  {cropOptions.map((crop) => (
    <option key={crop.id} value={crop.name}>
      {crop.icon} {crop.name}
    </option>
  ))}
</select>

{/* Subtype dropdown if crop has riceTypes */}
{updatedField.crops?.[cropYear]?.crop &&
  cropOptions.find(c => c.name === updatedField.crops?.[cropYear]?.crop)?.riceTypes?.length > 0 && (
    <select
      value={updatedField.crops?.[cropYear]?.riceType || ''}
      onChange={(e) => {
        setUpdatedField((prev) => ({
          ...prev,
          crops: {
            ...prev.crops,
            [cropYear]: {
              ...prev.crops?.[cropYear],
              riceType: e.target.value,
            },
          },
        }));
      }}
      className="border p-2 rounded"
    >
      <option value="">Select Rice Type</option>
      {cropOptions
        .find(c => c.name === updatedField.crops?.[cropYear]?.crop)
        ?.riceTypes?.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
    </select>
)}


            </>
          ) : (
            <div className="col-span-2 space-y-1">
              <div className="font-medium">Crop: {crop || '—'}</div>
              {crop === 'Rice' && (
                <div className="text-sm text-gray-600">Type: {field.crops?.[cropYear]?.riceType || '—'}</div>
              )}
              <div className="text-gray-700">
                Variety: <span className="text-gray-800 font-semibold">{variety || '— (from job)'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Buttons */}
      <div className="mb-6">
        {editMode ? (
          <>
            <button onClick={handleUpdate} className="bg-green-600 text-white text-sm px-4 py-2 rounded shadow mr-2">
              Save Changes
            </button>
            <button onClick={handleCancel} className="bg-gray-500 text-white text-sm px-4 py-2 rounded shadow">
              Cancel
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEditMode(true)} className="bg-blue-600 text-white text-sm px-4 py-2 rounded shadow mr-2">
              Edit Field Info
            </button>
            <button onClick={() => navigate('/')} className="bg-gray-400 text-white text-sm px-4 py-2 rounded shadow">
              ← Back to Fields
            </button>
          </>
        )}
      </div>

      {/* Boundary Viewer */}
      <div className="bg-white p-3 rounded shadow col-span-2 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">🗺️ Field Outline</h3>
        {field.boundary?.geojson ? (
          <>
            <div id="boundary-preview-map" className="h-52 w-full rounded border" />

            <button
              onClick={() => navigate(`/fields/${field.id}/boundary-editor`)}
              className="text-sm text-blue-600 underline mt-2"
            >
              📝 Edit Boundary
            </button>
          </>
        ) : (
          <>
            <p className="text-sm italic text-gray-500">No boundary assigned to this field yet.</p>
            <button
              onClick={() => navigate(`/fields/${field.id}/boundary-editor`)}
              className="text-sm text-blue-600 underline mt-2"
            >
              ➕ Add Boundary
            </button>
          </>
        )}
      </div>

      {/* Job History */}
      <div className="bg-white p-3 rounded shadow col-span-2 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">🧾 Job History</h3>
        {fieldJobs.length === 0 ? (
          <p className="text-sm italic text-gray-500">No jobs recorded for this field yet.</p>
        ) : (
          <ul className="space-y-2">
            {fieldJobs
              .filter(job => job.cropYear === cropYear)
              .map(job => (
                <li key={job.id} className="text-sm border rounded p-2 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{job.jobType}</p>
                      <p className="text-gray-600 text-sm">{job.jobDate || '—'} • {job.acres} acres</p>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Notes Placeholder */}
      <div className="bg-white p-3 rounded shadow col-span-2">
        <h3 className="text-sm font-semibold text-gray-700">📝 Notes + Observations</h3>
      </div>
    </div>
  );
}
