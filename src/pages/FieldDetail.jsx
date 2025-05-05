// src/pages/FieldDetail.jsx
import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useCropYear } from '../context/CropYearContext';
import area from '@turf/area';
import { Pencil, Trash2, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

const updateFieldNameInJobs = async (fieldId, newFieldName) => {
  const q = query(collection(db, 'jobsByField'), where('fieldId', '==', fieldId));
  const snap = await getDocs(q);

  const updates = snap.docs.map(docSnap =>
    updateDoc(doc(db, 'jobsByField', docSnap.id), {
      fieldName: newFieldName
    })
  );

  await Promise.all(updates);
  console.log(`🛠 Updated fieldName in ${snap.size} jobs`);
};
const syncAllFieldNamesToGroupedJobs = async () => {
  const fieldsSnap = await getDocs(collection(db, 'fields'));
  const jobsSnap = await getDocs(collection(db, 'jobs'));

  const allFields = fieldsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const allJobs = jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const updates = [];

  for (const job of allJobs) {
    if (!Array.isArray(job.fields)) continue;

    let updated = false;
    const updatedFields = job.fields.map(f => {
      const match = allFields.find(field => field.id === f.id);
      if (match && match.fieldName !== f.fieldName) {
        updated = true;
        return { ...f, fieldName: match.fieldName };
      }
      return f;
    });

    if (updated) {
      updates.push(updateDoc(doc(db, 'jobs', job.id), { fields: updatedFields }));
    }
  }

  await Promise.all(updates);
  console.log(`🛠 Fully updated field names in ${updates.length} grouped jobs`);
};


export default function FieldDetail() {
  const { fieldId } = useParams();
  const navigate = useNavigate();
  const { cropYear, setCropYear } = useCropYear();
  const { role, loading } = useUser();
if (loading || !role) return null;

  const [field, setField] = useState(null);
  const [updatedField, setUpdatedField] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [fieldJobs, setFieldJobs] = useState([]);
  const [cropOptions, setCropOptions] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);


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
   setUpdatedField(prev => ({
  ...data,
  riceLeveeAcres: data.riceLeveeAcres ?? '',
  beanLeveeAcres:
    data.beanLeveeAcres ??
    (data.riceLeveeAcres ? +(data.riceLeveeAcres * 0.5).toFixed(2) : ''),
}));


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
    const jobs = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      fieldName: field?.fieldName || '—', // manually inject it
    }));
    setFieldJobs(jobs);
  };

  if (field) fetchFieldJobs();
}, [fieldId, field]);


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

// 🚫 Prevent sending geojson if not editing boundary
if (clean.boundary?.geojson && typeof clean.boundary.geojson === 'object') {
  delete clean.boundary;
}

// 🧠 Auto-fill bean levee acres if blank
if (
  (clean.beanLeveeAcres === undefined || clean.beanLeveeAcres === '') &&
  clean.riceLeveeAcres &&
  !isNaN(clean.riceLeveeAcres)
) {
  clean.beanLeveeAcres = +(clean.riceLeveeAcres * 0.5).toFixed(2);
}

await updateDoc(ref, clean);

const updatedSnap = await getDoc(ref);
const updatedData = { id: fieldId, ...updatedSnap.data() };

// ✅ Patch crash: safely re-parse boundary.geojson
if (
  updatedData.boundary?.geojson &&
  typeof updatedData.boundary.geojson === 'string'
) {
  try {
    updatedData.boundary.geojson = JSON.parse(updatedData.boundary.geojson);
  } catch {
    console.warn('Failed to parse boundary after update');
    updatedData.boundary.geojson = null;
  }
}
// 🧠 Update fieldName in all matching jobsByField entries
await updateFieldNameInJobs(fieldId, clean.fieldName);

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
    ['landownerRentShare', 'Landowner Rent %'],
    ['riceLeveeAcres', 'Rice Levee Acres'],
    ['beanLeveeAcres', 'Bean Levee Acres'],

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

  if (!field || !updatedField) {
  return <div className="p-6">Loading field data...</div>;
}


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
       {fieldOrder && Array.isArray(fieldOrder) && fieldOrder.map(([key, label]) => (
  <div key={key} className="bg-white p-3 rounded shadow">
    <label className="block text-xs text-gray-500 mb-1">{label}</label>
    {editMode ? (
      <>
        <input
          className="border p-2 rounded w-full"
          value={updatedField[key] !== undefined ? updatedField[key] : ''}
          onChange={(e) => {
            const value = e.target.value;
            const numericKeys = [
              'operatorExpenseShare',
              'operatorRentShare',
              'landownerExpenseShare',
              'landownerRentShare',
              'riceLeveeAcres',
              'beanLeveeAcres',
              'gpsAcres',
              'fsaAcres'
            ];
            setUpdatedField({
              ...updatedField,
              [key]: numericKeys.includes(key) ? Number(value) : value
            });
          }}
        />
        {key === 'riceLeveeAcres' && (
          <p className="text-xs text-gray-500 mt-1 italic">
            Used for levee making and levee seeding when crop is rice
          </p>
        )}
        {key === 'beanLeveeAcres' && (
          <p className="text-xs text-gray-500 mt-1 italic">
            Used for levee making when crop is soybeans (defaults to 50% of rice levees)
          </p>
        )}
      </>
    ) : (
      <div className="font-medium">
        {key === 'gpsAcres' ? gpsAcresFromBoundary : field[key] || '—'}
      </div>
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
    {role !== 'viewer' && (
      <button onClick={() => setEditMode(true)} className="bg-blue-600 text-white text-sm px-4 py-2 rounded shadow mr-2">
        Edit Field Info
      </button>
    )}
    <button onClick={() => navigate('/')} className="bg-gray-400 text-white text-sm px-4 py-2 rounded shadow">
      ← Back to Fields
    </button>
  </>
)}
{role === 'admin' && (
  <button
    onClick={syncAllFieldNamesToGroupedJobs}
    className="bg-yellow-500 text-white px-4 py-2 rounded shadow hover:bg-yellow-600 mt-6"
  >
    🔁 Sync Field Names to Grouped Jobs
  </button>
)}

      </div>

      {/* Boundary Viewer */}
      <div className="bg-white p-3 rounded shadow col-span-2 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">🗺️ Field Outline</h3>
        {field.boundary?.geojson ? (
          <>
            <div id="boundary-preview-map" className="h-52 w-full rounded border" />

           {role !== 'viewer' && (
  <button
    onClick={() => navigate(`/fields/${field.id}/boundary-editor`)}
    className="text-sm text-blue-600 underline mt-2"
  >
    📝 Edit Boundary
  </button>
)}

          </>
        ) : (
          <>
            <p className="text-sm italic text-gray-500">No boundary assigned to this field yet.</p>
          {role !== 'viewer' && (
  <button
    onClick={() => navigate(`/fields/${field.id}/boundary-editor`)}
    className="text-sm text-blue-600 underline mt-2"
  >
    ➕ Add Boundary
  </button>
)}

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
 <li key={job.id} className="text-sm border rounded p-3 bg-white shadow">
  <div className="flex justify-between items-start">
    <div>
      <div className="text-sm font-semibold text-blue-700 flex items-center gap-1">
{typeof job.jobType === 'string' ? job.jobType : job.jobType?.name}      </div>
      <div className="text-xs text-gray-500">
        {job.cropYear} • {job.fieldName}
      </div>

      {(() => {
        const p = job.products?.[0];
        return p ? (
          <div className="text-sm text-gray-600 mt-1">
            {p.productName || p.name} • {p.rate} {p.unit}
          </div>
        ) : null;
      })()}

      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
        <Badge variant={job.status?.toLowerCase()}>{job.status}</Badge>
        <span>{(job.acres || job.drawnAcres || 0).toFixed(2)} acres</span>
      </div>
    </div>


    {role !== 'viewer' && (
  <div className="flex gap-2">
    <button
      onClick={() => navigate(`/jobs/field/${job.id}`)}
      className="text-gray-500 hover:text-gray-700"
      title="View/Edit Job"
    >
      <Pencil size={16} />
    </button>
    <button
      onClick={() => setConfirmDeleteId(job.id)}
      className="text-gray-500 hover:text-gray-700"
      title="Delete Job"
    >
      <Trash2 size={16} />
    </button>
    <button
      onClick={async () => {
        const { generatePDFBlob } = await import('../utils/generatePDF');
        const blob = await generatePDFBlob(job);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `JobOrder_${job.jobType}_${job.cropYear}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }}
      className="text-gray-500 hover:text-gray-700"
      title="Download PDF"
    >
      <FileText size={16} />
    </button>
  </div>
)}

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
     

{confirmDeleteId && (
  <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
      <p className="text-sm text-gray-800 mb-4">
        Are you sure you want to delete this job? This can’t be undone.
      </p>
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setConfirmDeleteId(null)}
          className="px-3 py-1 rounded text-sm bg-gray-200 hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            await deleteDoc(doc(db, 'jobsByField', confirmDeleteId));
            setFieldJobs(prev => prev.filter(j => j.id !== confirmDeleteId));
            setConfirmDeleteId(null);
          }}
          className="px-3 py-1 rounded text-sm bg-red-600 text-white hover:bg-red-700"
        >
          Yes, Delete
        </button>
      </div>
    </div>
  </div>
)}

?
    </div>
  );
}
