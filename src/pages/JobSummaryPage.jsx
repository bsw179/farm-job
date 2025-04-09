// ✅ Cleaned-up JobSummaryPage.jsx
// - Saves waterVolume
// - Adds productName to saved data
// - Removes duplicate <option> render
// - Ready for duplicate product rows and validations

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import Select from 'react-select';
import html2canvas from 'html2canvas';
import { query, where } from 'firebase/firestore'; 

function JobSummaryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    jobType: initialJobType,
    cropYear = new Date().getFullYear(),
    selectedFields = []
  } = location.state || {};

  const [jobType, setJobType] = useState(initialJobType || '');
  const [fields, setFields] = useState([]);
  const [jobDate, setJobDate] = useState('');
  const [jobStatus, setJobStatus] = useState('Planned');
  const [saving, setSaving] = useState(false);
  const [shouldGeneratePDF, setShouldGeneratePDF] = useState(true);
  const [vendor, setVendor] = useState(location.state?.vendor || '');
  const [applicator, setApplicator] = useState(location.state?.applicator || '');
  const [vendors, setVendors] = useState([]);
  const [applicators, setApplicators] = useState([]);
  const [editableProducts, setEditableProducts] = useState(location.state?.products || []);
  const [productsList, setProductsList] = useState([]);
  const [jobTypesList, setJobTypesList] = useState([]);
  const [waterVolume, setWaterVolume] = useState('');

  const totalJobAcres = fields.reduce((sum, f) => sum + (f.drawnAcres ?? f.gpsAcres ?? 0), 0);


  const selectedJobTypeData = jobTypesList.find(j => j.name === jobType);
  const requiresProducts = ['Seeding', 'Spraying', 'Fertilizing'].includes(jobType);
 console.log('🧪 requiresProducts:', requiresProducts, 'jobType:', jobType);

  const selectedProductType = selectedJobTypeData?.productType || '';
  const requiresWater = selectedJobTypeData?.requiresWater || false;


  useEffect(() => {
  const loadData = async () => {
    const [vendorSnap, applicatorSnap, productSnap, jobTypeSnap] = await Promise.all([
      getDocs(collection(db, 'vendors')),
      getDocs(collection(db, 'applicators')),
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'jobTypes'))
    ]);

    setVendors(vendorSnap.docs.map(doc => doc.data().name));
    setApplicators(applicatorSnap.docs.map(doc => doc.data().name));
    setProductsList(productSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // 🔥 Replace this line:
    // setJobTypesList(jobTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // 🔁 With this:
    const rawTypes = jobTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const flattenedTypes = rawTypes.flatMap((type) => {
       const base = {
        name: type.name,
        productType: type.productType || '',
        requiresProducts: ['Seeding', 'Spraying', 'Fertilizing'].includes(type.name),
        requiresWater: type.requiresWater || false
      };

const subtypes = type.subTypes?.map(sub => ({
        ...base,
        name: sub
      })) || [];

      return [base, ...subtypes];
    });
     console.log('🧨 Flattened types:', flattenedTypes.map(j => j.name));

    setJobTypesList(flattenedTypes);
  };

  loadData();
}, []);


  useEffect(() => {
  const loadJob = async () => {
    const isEditing = location.state?.isEditing;
    const jobId = location.state?.jobId;
    if (!isEditing || !jobId) return;

    const jobDoc = await getDoc(doc(db, 'jobs', jobId));
    if (!jobDoc.exists()) return;

    const jobData = jobDoc.data();

    setJobType(jobData.jobType || '');
    setJobDate(jobData.jobDate || '');
    setVendor(jobData.vendor || '');
    setApplicator(jobData.applicator || '');
    setJobStatus(jobData.status || 'Planned');
    setEditableProducts(jobData.products || []);
    setWaterVolume(jobData.waterVolume || '');
    setFields(jobData.fields || []);
  };

  loadJob();
}, [location.state]);


  useEffect(() => {
    if (location.state?.selectedFields?.length) {
      setFields(location.state.selectedFields);
    }
  }, [location.key]);

  const handleProductChange = (index, field, value) => {
    const updated = [...editableProducts];
    updated[index][field] = value;
    setEditableProducts(updated);
  };

  const handleAddProduct = () => {
    setEditableProducts(prev => [...prev, { productId: '', productName: '', rate: '', unit: '' }]);
  };

 function renderBoundarySVG(geometry, overlayRaw) {
if (!geometry) return null;

let shape = geometry;
if (geometry.type === 'Feature' && geometry.geometry?.type === 'Polygon') {
  shape = geometry.geometry;
}

if (shape.type !== 'Polygon' || !shape.coordinates?.[0]) return null;

const coords = shape.coordinates[0];

  const bounds = coords.reduce((acc, [lng, lat]) => ({
    minX: Math.min(acc.minX, lng),
    maxX: Math.max(acc.maxX, lng),
    minY: Math.min(acc.minY, lat),
    maxY: Math.max(acc.maxY, lat)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

  const width = bounds.maxX - bounds.minX || 1;
  const height = bounds.maxY - bounds.minY || 1;
  const scale = Math.min(280 / width, 280 / height); // controls size in box

  const path = coords.map(([lng, lat], i) => {
    const x = (lng - bounds.minX) * scale + 10;
    const y = 300 - ((lat - bounds.minY) * scale) - 10;
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ') + ' Z';

  let overlay = overlayRaw;
  if (typeof overlay === 'string') {
    try { overlay = JSON.parse(overlay); } catch { overlay = null; }
  }

  let overlayPath = null;
  if (overlay?.type === 'Feature' && overlay.geometry?.type === 'Polygon') {
    overlayPath = overlay.geometry.coordinates[0].map(([lng, lat], i) => {
      const x = (lng - bounds.minX) * scale + 10;
      const y = 300 - ((lat - bounds.minY) * scale) - 10;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ') + ' Z';
  }

  return (
    <svg viewBox="0 0 300 300" className="w-full h-48 bg-gray-100 border rounded">
      <path d={path} fill="none" stroke="#1e40af" strokeWidth="2" />
      {overlayPath && (
        <path d={overlayPath} fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="2" />
      )}
    </svg>
  );
}


 const handleSaveJob = async () => {
  setSaving(true);
  const isEditing = location.state?.isEditing;
  const jobId = isEditing ? location.state?.jobId : doc(collection(db, 'jobs')).id;

  if (!jobType) {
    alert('Please select a job type before saving.');
    setSaving(false);
    return;
  }

  if (fields.length === 0) {
    alert('Please add at least one field.');
    setSaving(false);
    return;
  }

 if (requiresProducts && editableProducts.length === 0) {
  alert('Please add at least one product.');
  setSaving(false);
  return;
}


  const incompleteProduct = editableProducts.find(p =>
    !p.productId || !p.rate || !p.unit
  );

  if (incompleteProduct) {
    alert('Please fill out all product fields (product, rate, and unit).');
    setSaving(false);
    return;
  }

 try {
  const updatedFields = await Promise.all(fields.map(async (field) => {
    const ref = document.getElementById(`field-canvas-${field.id}`);
    if (!ref) return field;

    const buttons = ref.querySelectorAll('.no-print');
    buttons.forEach(btn => btn.style.display = 'none');

    const canvas = await html2canvas(ref);
    const imageBase64 = canvas.toDataURL('image/png');

    buttons.forEach(btn => btn.style.display = '');

    return { ...field, imageBase64 };
  }));

  const updatedFieldsWithAcres = updatedFields.map(f => ({
    ...f,
    acres: f.drawnAcres ?? f.gpsAcres ?? 0
  }));

  const masterJob = {
    jobId,
    jobType,
    vendor,
    applicator,
    products: editableProducts,
    cropYear,
    jobDate: jobDate || new Date().toISOString().split('T')[0],
    status: jobStatus, // ← uses real selected status now
    fieldIds: updatedFieldsWithAcres.map(f => f.id),
    waterVolume: requiresWater ? waterVolume : '',
    fields: updatedFieldsWithAcres,
    acres: Object.fromEntries(updatedFieldsWithAcres.map(f => [f.id, f.acres])),
    timestamp: serverTimestamp()
  };

  await setDoc(doc(db, 'jobs', jobId), masterJob); // ← final and only call to save job

 if (isEditing) {
  const q = query(collection(db, 'jobsByField'), where('linkedToJobId', '==', jobId));
  const existing = await getDocs(q);
  await Promise.all(existing.docs.map(docSnap => deleteDoc(doc(db, 'jobsByField', docSnap.id))));
}

  const jobsByFieldPromises = updatedFieldsWithAcres.map(field => {
      const jobEntry = {
       jobId,
       linkedToJobId: jobId, // 🔥 new field here
       fieldId: field.id,
      fieldName: field.fieldName,
      cropYear,
      crop: field.crop || field.crops?.[cropYear]?.crop || '',
      acres: field.acres,
      drawnAcres: field.drawnAcres ?? null,
      drawnPolygon: field.drawnPolygon ?? null,
      vendor,
      applicator,
      jobType,
      jobDate: jobDate || new Date().toISOString().split('T')[0],
      products: editableProducts,
      waterVolume: requiresWater ? waterVolume : '',
      timestamp: serverTimestamp()
    };
    return setDoc(doc(db, 'jobsByField', `${jobId}_${field.id}`), jobEntry);
  });

  await Promise.all(jobsByFieldPromises);

const jobObj = {
  ...masterJob,
  fields: updatedFieldsWithAcres,
  acres: Object.fromEntries(updatedFieldsWithAcres.map(f => [f.id, f.acres]))
};


    if (shouldGeneratePDF) {
      const { generatePDFBlob } = await import('../utils/generatePDF');
      const blob = await generatePDFBlob(jobObj);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `JobOrder_${jobType}_${cropYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    navigate('/jobs');
  } catch (error) {
    console.error('Error saving job:', error);
    alert('Failed to save job.');
  } finally {
    setSaving(false);
  }
};


console.log('Dropdown options:', jobTypesList.map(j => j.name));


  return (
    <div className="p-6">
      <p className="text-xs text-red-500 mb-2">
  requiresProducts: {String(requiresProducts)}
</p>

      {/* Inputs and product selectors */}
      <div className="mb-4">
        <label className="block text-sm font-medium">Job Type</label>
        <select value={jobType} onChange={e => setJobType(e.target.value)} className="border p-2 rounded w-full">
          {jobTypesList.map(type => (
<option key={type.name} value={type.name}>
  {type.name}
</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">Job Date</label>
          <input type="date" value={jobDate} onChange={e => setJobDate(e.target.value)} className="border p-2 rounded w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium">Vendor</label>
          <select value={vendor} onChange={e => setVendor(e.target.value)} className="border p-2 rounded w-full">
            <option value="">Select Vendor</option>
            {vendors.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Applicator</label>
          <select value={applicator} onChange={e => setApplicator(e.target.value)} className="border p-2 rounded w-full">
            <option value="">Select Applicator</option>
            {applicators.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <div className="mb-4">
  <label className="block text-sm font-medium">Job Status</label>
  <select
    value={jobStatus}
    onChange={(e) => setJobStatus(e.target.value)}
    className="border p-2 rounded w-full"
  >
    <option value="Planned">Planned</option>
<option value="Completed">Completed</option>
  </select>
</div>

        </div>
      </div>

     {requiresProducts && editableProducts.map((p, i) => (
  <div key={i} className="grid grid-cols-4 ...">
    <Select
      placeholder="Product"
      options={productsList
        .filter(prod =>
          selectedProductType === '' ||
          prod.type?.toLowerCase() === selectedProductType.toLowerCase()
        )
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(prod => ({
  value: prod.id,
  label: prod.name,
  unit: prod.unit,
  crop: prod.crop // ✅ add this!
}))
      }
      value={productsList.find(prod => prod.id === p.productId) ? {
        value: p.productId,
        label: p.productName || productsList.find(prod => prod.id === p.productId)?.name
      } : null}
      onChange={selected => {
        handleProductChange(i, 'productId', selected?.value || '');
        handleProductChange(i, 'productName', selected?.label || '');
        handleProductChange(i, 'unit', selected?.unit || '');
      handleProductChange(i, 'crop', selected.crop);

      }}
      isClearable
    />
    <input
      type="number"
      placeholder="Rate"
      className="border p-2 rounded"
      value={p.rate}
      onChange={e => handleProductChange(i, 'rate', e.target.value)}
    />
    <select
      className="border p-2 rounded w-full"
      value={p.unit}
      onChange={(e) => handleProductChange(i, 'unit', e.target.value)}
    >
      <option value="">Select Unit</option>
      <option value="oz/acre">oz/acre</option>
      <option value="pt/acre">pt/acre</option>
      <option value="qt/acre">qt/acre</option>
      <option value="gal/acre">gal/acre</option>
      <option value="lbs/acre">lbs/acre</option>
      <option value="seeds/acre">seeds/acre</option>
      <option value="units/acre">units/acre</option>
    </select>
    <button
      className="text-sm text-red-600 underline"
      onClick={() =>
        setEditableProducts(prev => prev.filter((_, idx) => idx !== i))
      }
    >
      🗑️ Remove
    </button>
  </div>
))}


{requiresProducts && (
  <button onClick={handleAddProduct} className="text-blue-600 underline mb-4">
    + Add Product
  </button>
)}
      {requiresWater && (
        <div className="mb-4">
          <label className="block text-sm font-medium">Water Volume (gal/acre)</label>
          <input type="number" className="border rounded p-2 w-48" value={waterVolume} onChange={e => setWaterVolume(e.target.value)} />
        </div>
      )}
<div className="mb-6">
<h3 className="text-lg font-semibold mb-2">
  Fields ({fields.length}) – {totalJobAcres} acres total

  
</h3>

 {fields.map((field) => {
  const isPartial = field.drawnPolygon && field.drawnAcres;
const displayAcres = (isPartial ? field.drawnAcres : field.gpsAcres) ?? 0;
  const crop = field.crop || field.crops?.[cropYear]?.crop || '—';

  let parsedGeo = field.boundary?.geojson;
  if (typeof parsedGeo === 'string') {
    try {
      parsedGeo = JSON.parse(parsedGeo);
    } catch {
      parsedGeo = null;
    }
  }

  return (
  <div key={field.id} className="border rounded p-4 mb-4">
  <p>
    <strong>{field.fieldName}</strong> – {Number(displayAcres).toFixed(2)} acres
 – {isPartial ? 'partial' : 'full'}
  </p>
  <p>Crop: {crop}</p>

      <div className="mt-4" id={`field-canvas-${field.id}`}>
        {renderBoundarySVG(parsedGeo, field.drawnPolygon)}
      </div>

      <div className="flex justify-between items-center mt-2 no-print">
        <button
          className="text-sm text-blue-600 underline"
          onClick={() =>
            navigate(`/jobs/edit-area/${field.id}`, {
              state: {
                field,
                selectedFields: fields,
                jobType,
                vendor,
                applicator,
                products: editableProducts,
                cropYear
              }
            })
          }
        >
          ✏️ Edit Area
        </button>

        <button
          className="text-sm text-red-600 underline"
          onClick={() => setFields(prev => prev.filter(f => f.id !== field.id))}
        >
          ❌ Remove Field
        </button>
      </div>
    </div>
  );
})}

</div>
<div className="mt-6 border-t pt-4">
    <h4 className="font-semibold text-sm mb-2">Product Totals</h4>
    {editableProducts.map((p, i) => {
      const rate = parseFloat(p.rate);
      const unit = p.unit?.toLowerCase() || '';
      const crop = p.crop?.toLowerCase?.() || '';
      const totalAcres = fields.reduce((sum, f) => sum + (f.drawnAcres ?? f.gpsAcres ?? 0), 0);
      const totalAmount = rate * totalAcres;

      let display = `${totalAmount.toFixed(1)} ${p.unit}`;

      if (['seeds/acre', 'population'].some(u => unit.includes(u))) {
        const seedsPerUnit = crop.includes('rice') ? 900000 : crop.includes('soybean') ? 140000 : 1000000;
        const units = totalAmount / seedsPerUnit;
        display = `${units.toFixed(1)} units`;
      }

      if (['lbs/acre', 'pounds/acre', 'bushels (45 lbs/bu)'].some(u => unit.includes(u))) {
        const lbsPerBushel = crop.includes('rice') ? 45 : crop.includes('soybean') ? 60 : 50;
        const bushels = totalAmount / lbsPerBushel;
        display = `${bushels.toFixed(1)} bushels`;
      }

      return (
        <div key={i} className="text-sm text-gray-700">
          {p.productName || p.name || 'Unnamed'} → <span className="font-mono">{display}</span>
        </div>
      );
    })}
  </div>

      <div className="flex justify-between items-center">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={shouldGeneratePDF} onChange={() => setShouldGeneratePDF(!shouldGeneratePDF)} />
          <span>Generate PDF after saving</span>
        </label>
        <button
  className="bg-green-600 text-white px-4 py-2 rounded"
  onClick={handleSaveJob}
  disabled={saving}
>
  {saving
    ? 'Saving...'
    : location.state?.isEditing
      ? 'Update Job'
      : 'Save Final Job'}
</button>

      </div>
    </div>
  );
}

export default JobSummaryPage;
