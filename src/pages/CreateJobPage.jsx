// simplified CreateJobPage.jsx with just field selection and crop assignment
import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { useCropYear } from '../context/CropYearContext';

export default function CreateJobPage() {
  const navigate = useNavigate();
  const [fields, setFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFarms, setExpandedFarms] = useState([]);
  const [assigningCropField, setAssigningCropField] = useState(null);
  const [newCrop, setNewCrop] = useState('');
  const { cropYear } = useCropYear();

  useEffect(() => {
    const fetchFields = async () => {
      const fieldSnap = await getDocs(collection(db, 'fields'));
      setFields(fieldSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchFields();
  }, []);

  const toggleField = (field) => {
    setSelectedFields(prev =>
      prev.find(f => f.id === field.id)
        ? prev.filter(f => f.id !== field.id)
        : [...prev, field]
    );
  };

  const handleAssignCrop = async () => {
    if (!assigningCropField || !newCrop) return;
    await updateDoc(doc(db, 'fields', assigningCropField.id), {
      crops: {
        ...(assigningCropField.crops || {}),
        [cropYear]: { crop: newCrop }
      }
    });
    setFields(prev =>
      prev.map(f =>
        f.id === assigningCropField.id
          ? {
              ...f,
              crops: {
                ...(f.crops || {}),
                [cropYear]: { crop: newCrop }
              }
            }
          : f
      )
    );
    setAssigningCropField(null);
    setNewCrop('');
  };

  const groupedFields = fields.reduce((acc, field) => {
    const farm = field.farmName || 'Unknown Farm';
    if (!acc[farm]) acc[farm] = [];
    acc[farm].push(field);
    return acc;
  }, {});

  const filteredGrouped = Object.entries(groupedFields).filter(([farm, fieldList]) =>
    farm.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fieldList.some(f => f.fieldName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleContinue = () => {
    if (selectedFields.length === 0) {
      alert('Please select at least one field');
      return;
    }
    navigate('/jobs/summary', {
      state: {
        selectedFields,
        cropYear
      }
    });
  };

  return (
   <div className="flex flex-col h-screen">

  {/* Sticky Toolbar */}
  <div className="shrink-0">
    <div className="sticky top-0 z-10 bg-white pb-2 pt-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 px-4">
        <div className="flex items-center gap-3">
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-semibold" onClick={handleContinue}>
            Create Job →
          </button>
          <span className="text-sm text-gray-600">Fields Selected: {selectedFields.length}</span>
        </div>
        <button className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300" onClick={() => navigate('/jobs')}>
          ← Back to Jobs
        </button>
      </div>

      <div className="px-4 pb-2">
        <input
          type="text"
          placeholder="Search fields or farm names..."
          className="border p-2 rounded w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
    </div>  {/* end sticky header */}
  </div>  {/* end shrink-0 wrapper */}


<div className="overflow-y-auto grow px-6 pb-6 min-h-[200px]">
  {filteredGrouped.length > 0 ? (
    filteredGrouped.map(([farm, farmFields]) => (
      <div key={farm} className="mb-4 border rounded">
        <button
          onClick={() =>
            setExpandedFarms(prev =>
              prev.includes(farm)
                ? prev.filter(f => f !== farm)
                : [...prev, farm]
            )
          }
          className="w-full text-left bg-gray-100 px-4 py-2 font-semibold"
        >
          {expandedFarms.includes(farm) ? '▼' : '▶'} {farm}
        </button>

        {expandedFarms.includes(farm) && (
          <div className="space-y-2 p-4">
            {farmFields
              .filter(f =>
                f.fieldName.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .sort((a, b) => a.fieldName.localeCompare(b.fieldName))
              .map(field => (
                <div
                  key={field.id}
                  className="border rounded-lg p-4 flex items-center justify-between shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={!!selectedFields.find(f => f.id === field.id)}
                      onChange={() => toggleField(field)}
                    />
                    <div>
                      <div className="font-semibold text-sm">{field.fieldName}</div>
                      <div className="text-xs text-gray-600">
                        {Math.ceil(field.gpsAcres || 0)} acres • Crop:{' '}
                        {(field.crop || field.crops?.[cropYear]?.crop) ? (
                          field.crop || field.crops[cropYear]?.crop
                        ) : (
                          <span
                            className="text-sm text-red-500 cursor-pointer"
                            onClick={() => setAssigningCropField(field)}
                          >
                            Assign Crop
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    ))
  ) : (
    <div className="text-center text-sm text-gray-500 mt-10">
      No fields found.
    </div>
  )}
</div>

     

      {assigningCropField && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Assign Crop to {assigningCropField.fieldName}</h2>
            <select className="w-full border p-2 rounded mb-4" value={newCrop} onChange={(e) => setNewCrop(e.target.value)}>
              <option value="">Select Crop</option>
              <option value="Rice">Rice</option>
              <option value="Soybeans">Soybeans</option>
              <option value="Corn">Corn</option>
            </select>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 border rounded" onClick={() => setAssigningCropField(null)}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleAssignCrop}>Assign Crop</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
