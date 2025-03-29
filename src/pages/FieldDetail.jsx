import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import db from '../firebase';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';
import { EditControl } from 'react-leaflet-draw';

export default function FieldDetail() {
  const { fieldId } = useParams();
  const navigate = useNavigate();
  const [field, setField] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showDraw, setShowDraw] = useState(false);
  const [updatedField, setUpdatedField] = useState({});
  const [cropYear, setCropYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchData = async () => {
      const ref = doc(db, 'fields', fieldId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setField(data);
        setUpdatedField(data);
      }
    };
    fetchData();
  }, [fieldId]);

  const handleUpdate = async () => {
    const ref = doc(db, 'fields', fieldId);
    await updateDoc(ref, updatedField);
    setEditMode(false);
    setField(updatedField);
  };

  const handleCancel = () => {
    setUpdatedField(field);
    setEditMode(false);
  };

  const saveBoundary = async (geo) => {
    const ref = doc(db, 'fields', fieldId);
    const newField = {
      ...field,
      boundary: {
        geojson: geo,
        year: cropYear
      }
    };
    await updateDoc(ref, newField);
    setField(newField);
    setShowDraw(false);
  };

  if (!field) return <div>Loading field...</div>;

  const crop = field.crops?.[cropYear]?.crop || '';
  const variety = field.crops?.[cropYear]?.variety || '';

  const editableFields = [
    'fieldName', 'farmName', 'gpsAcres', 'fsaAcres',
    'county', 'farmNumber', 'tractNumber', 'fsaFieldNumber',
    'operator', 'operatorRentShare', 'operatorExpenseShare',
    'landowner', 'landownerRentShare', 'landownerExpenseShare'
  ];

  return (
    <div>
      <div className="flex justify-between mb-6">
        <h2 className="text-xl font-bold">{field.fieldName} – Field Details</h2>
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => setCropYear(c => c - 1)} className="text-blue-600 font-bold">⬅</button>
          <span className="font-semibold text-gray-700">{cropYear}</span>
          <button onClick={() => setCropYear(c => c + 1)} className="text-blue-600 font-bold">➡</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        {editableFields.map((key) => (
          <div key={key} className="bg-white p-3 rounded shadow">
            <label className="block text-xs text-gray-500 mb-1">{key}</label>
            {editMode ? (
              <input
                className="border p-1 rounded w-full"
                value={updatedField[key] || ''}
                onChange={(e) => setUpdatedField({ ...updatedField, [key]: e.target.value })}
              />
            ) : (
              <div className="font-medium">{field[key]}</div>
            )}
          </div>
        ))}
      </div>

      {/* Crop Assignment */}
      <div className="bg-white p-4 rounded shadow col-span-2 mb-6">
        <h3 className="text-sm font-semibold mb-2 text-gray-700">🌱 Crop Assignment – {cropYear}</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {editMode ? (
            <select
              value={updatedField.crops?.[cropYear]?.crop || ''}
              onChange={(e) =>
                setUpdatedField((prev) => ({
                  ...prev,
                  crops: {
                    ...prev.crops,
                    [cropYear]: {
                      ...prev.crops?.[cropYear],
                      crop: e.target.value
                    }
                  }
                }))
              }
              className="border p-2 rounded"
            >
              <option value="">Select Crop</option>
              <option value="Rice">Rice</option>
              <option value="Soybeans">Soybeans</option>
              <option value="Corn">Corn</option>
            </select>
          ) : (
            <div className="font-medium">Crop: {crop || '—'}</div>
          )}

          <div className="font-medium text-gray-700">
            Variety: <span className="text-gray-800 font-semibold">{variety || '— (from job)'}</span>
          </div>
        </div>
      </div>

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
          <button onClick={() => setEditMode(true)} className="bg-blue-600 text-white text-sm px-4 py-2 rounded shadow mr-2">
            Edit Field Info
          </button>
        )}
        <button onClick={() => navigate('/')} className="bg-gray-400 text-white text-sm px-4 py-2 rounded shadow">
          ← Back to Fields
        </button>
      </div>

      {/* Boundary View and Edit */}
      <div className="bg-white p-3 rounded shadow col-span-2 mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-gray-700">🗺️ Boundary Map</h3>
          <button onClick={() => setShowDraw(true)} className="text-sm text-blue-700 hover:underline">✏️ Edit Boundary</button>
        </div>

        {field.boundary?.geojson ? (
          <MapContainer style={{ height: 300 }} bounds={[[0, 0], [0, 0]]} scrollWheelZoom={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <GeoJSON data={field.boundary.geojson} />
          </MapContainer>
        ) : (
          <p className="text-gray-500 italic">No boundary assigned to this field yet.</p>
        )}
      </div>

      {/* Leaflet Draw Editor */}
      {showDraw && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="flex justify-between items-center p-4 bg-blue-700 text-white">
            <h2 className="text-lg font-semibold">Draw/Edit Boundary</h2>
            <button onClick={() => setShowDraw(false)} className="text-xl">×</button>
          </div>
          <MapContainer style={{ flex: 1 }} center={[35, -91]} zoom={13}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <EditControl
              position="topright"
              draw={{ rectangle: false, circle: false, circlemarker: false, marker: false, polyline: false }}
              onCreated={(e) => saveBoundary(e.layer.toGeoJSON().geometry)}
              onEdited={(e) => {
                const layers = e.layers.getLayers();
                if (layers.length > 0) saveBoundary(layers[0].toGeoJSON().geometry);
              }}
              onDeleted={() => saveBoundary(null)}
            />
          </MapContainer>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div className="bg-white p-3 rounded shadow col-span-2">🧾 Job History</div>
        <div className="bg-white p-3 rounded shadow col-span-2">📝 Notes + Observations</div>
      </div>
    </div>
  );
}
