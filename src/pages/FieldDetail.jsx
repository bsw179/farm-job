import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import db from '../firebase';

export default function FieldDetail() {
  const { fieldId } = useParams();
  const navigate = useNavigate();
  const [field, setField] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [updatedField, setUpdatedField] = useState({});

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

  if (!field) return <div>Loading field...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{field.fieldName} – Field Details</h2>

      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        {['farmName', 'gpsAcres', 'fsaAcres', 'county', 'operator'].map((key) => (
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
        <h3 className="text-sm font-semibold mb-2 text-gray-700">🌱 Crop Assignment – {new Date().getFullYear()}</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <select
            value={updatedField.crop || ''}
            onChange={(e) => setUpdatedField({ ...updatedField, crop: e.target.value })}
            className="border p-2 rounded"
          >
            <option value="">Select Crop</option>
            <option value="Rice">Rice</option>
            <option value="Soybeans">Soybeans</option>
            <option value="Corn">Corn</option>
          </select>
          <input
            placeholder="Variety (e.g. CLL18, DG563)"
            value={updatedField.variety || ''}
            onChange={(e) => setUpdatedField({ ...updatedField, variety: e.target.value })}
            className="border p-2 rounded"
          />
        </div>
      </div>

      <div className="mb-6">
        {editMode ? (
          <button onClick={handleUpdate} className="bg-green-600 text-white text-sm px-4 py-2 rounded shadow mr-2">
            Save Changes
          </button>
        ) : (
          <button onClick={() => setEditMode(true)} className="bg-blue-600 text-white text-sm px-4 py-2 rounded shadow mr-2">
            Edit Field Info
          </button>
        )}
        <button onClick={() => navigate('/')} className="bg-gray-500 text-white text-sm px-4 py-2 rounded shadow">
          ← Back to Fields
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div className="bg-white p-3 rounded shadow">🗺️ Map Thumbnail (boundary)</div>
        <div className="bg-white p-3 rounded shadow">🧾 Job History (placeholder)</div>
        <div className="bg-white p-3 rounded shadow col-span-2">📝 Notes & Observations</div>
      </div>
    </div>
  );
}
