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
import ProductComboBox from '../components/ProductComboBox';

function JobSummaryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    jobType: initialJobType,
    cropYear = new Date().getFullYear(),
    selectedFields = []
  } = location.state || {};

const [jobType, setJobType] = useState(() => {
  return location.state?.isEditing ? initialJobType : '';
});

const [fields, setFields] = useState([]);
useEffect(() => {
  const updated = location.state?.updatedField;
  if (updated) {
    const parsedPolygon = typeof updated.drawnPolygon === 'string'
      ? JSON.parse(updated.drawnPolygon)
      : updated.drawnPolygon;

    setFields(prevFields =>
      prevFields.map(f =>
        f.id === updated.id
          ? { ...f, ...updated, drawnPolygon: parsedPolygon }
          : f
      )
    );
  }
}, [location.state]);

  const [usedProductIds, setUsedProductIds] = useState([]);

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
  const [isEditing, setIsEditing] = useState(location.state?.isEditing || false);
  const [jobId, setJobId] = useState(location.state?.jobId || doc(collection(db, 'jobs')).id);
const [notes, setNotes] = useState(location.state?.notes || '');
const [passes, setPasses] = useState(location.state?.passes || 1);

const baseButton = "inline-flex items-center px-4 py-2 rounded shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1";
const primaryBtn = `${baseButton} bg-green-600 text-white hover:bg-green-700`;
const blueLinkBtn = "text-blue-600 hover:text-blue-800 underline text-sm";
const redLinkBtn = "text-red-600 hover:text-red-800 underline text-sm";  
const isLeveeJob = jobType?.name?.toLowerCase().includes('levee') || jobType?.name?.toLowerCase().includes('pack');

const totalJobAcres = fields.reduce((sum, f) => {
  if (isLeveeJob) {
    const crop = f.crop || f.crops?.[cropYear]?.crop || '';
    if (crop === 'Rice' && f.riceLeveeAcres) {
      return sum + parseFloat(f.riceLeveeAcres);
    }
    if (crop === 'Soybeans' && f.beanLeveeAcres) {
      return sum + parseFloat(f.beanLeveeAcres);
    }
  }
  return sum + (f.drawnAcres ?? f.gpsAcres ?? 0);
}, 0);


const requiresProducts = ['Seeding', 'Spraying', 'Fertilizing'].includes(
  jobType?.parentName
);

const selectedProductType = jobType?.productType || '';
const requiresWater = jobType?.parentName === 'Spraying';

useEffect(() => {
  // Only set default date if not editing and date is still blank
  if (!location.state?.isEditing && !jobDate) {
    const today = new Date().toISOString().split('T')[0];
    setJobDate(today);
  }
}, [location.state, jobDate]);
useEffect(() => {
  if (!location.state?.isEditing && !initialJobType) {
    setJobType('');
  }
}, [initialJobType, location.state]);

useEffect(() => {
  if (jobType && !jobTypesList.some(j => j.name === jobType)) {
  }
}, [jobType]);
useEffect(() => {
  const loadUsedProducts = async () => {
    if (!jobType) return;

    const q = query(
      collection(db, 'jobs'),
      where('jobType', '==', jobType),
      where('cropYear', '==', cropYear)
    );
    const snap = await getDocs(q);

    const allUsed = new Set();
    snap.docs.forEach(doc => {
      const products = doc.data().products || [];
      products.forEach(p => {
        if (p.productId) allUsed.add(p.productId);
      });
    });

    setUsedProductIds(Array.from(allUsed));
  };

  loadUsedProducts();
}, [jobType, cropYear]);

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

    const rawTypes = jobTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const flattenedTypes = rawTypes.flatMap(type =>
      (type.subTypes || []).map(sub => ({
        ...sub,
        parentName: type.name
      }))
    );

    setJobTypesList(flattenedTypes);

    if (initialJobType) {
      setJobType(initialJobType);
    }
  };

  loadData();
}, []);



  useEffect(() => {
  const loadJob = async () => {
    const jobId = location.state?.jobId;
    const editing = location.state?.isEditing;

    if (!editing || !jobId) return;

    setIsEditing(true); // ✅ keeps it locked in state

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
    setFields(
  (jobData.fields || []).map(f => ({
    ...f,
    drawnPolygon: typeof f.drawnPolygon === 'string'
      ? JSON.parse(f.drawnPolygon)
      : f.drawnPolygon
  }))
);

    setIsEditing(true);
    setJobId(jobId); // keeps the ID locked
    setNotes(jobData.notes || '');

  };

  loadJob();
}, [location.state]);



 useEffect(() => {
  const updated = location.state?.updatedField;
  if (!updated && location.state?.selectedFields?.length) {
    setFields(location.state.selectedFields);
  }
}, [location.key]);

useEffect(() => {
  const updated = location.state?.updatedField;
  const selected = location.state?.selectedFields || [];

  if (updated) {
    const parsedPolygon = typeof updated.drawnPolygon === 'string'
      ? JSON.parse(updated.drawnPolygon)
      : updated.drawnPolygon;

    const alreadyIncluded = selected.some(f => f.id === updated.id);
    const mergedFields = alreadyIncluded
      ? selected.map(f =>
          f.id === updated.id
            ? { ...f, ...updated, drawnPolygon: parsedPolygon }
            : f
        )
      : [...selected, { ...updated, drawnPolygon: parsedPolygon }];

    setFields(mergedFields);
  } else if (selected.length) {
    setFields(selected);
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
    maxY: Math.max(acc.maxY, lat),
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

  const width = bounds.maxX - bounds.minX || 1;
  const height = bounds.maxY - bounds.minY || 1;
  const boxSize = 300;
  const margin = 10;

  const scale = (boxSize - margin * 2) / Math.max(width, height);
  const xOffset = (boxSize - width * scale) / 2;
  const yOffset = (boxSize - height * scale) / 2;

  const project = ([lng, lat]) => ({
    x: (lng - bounds.minX) * scale + xOffset,
    y: boxSize - ((lat - bounds.minY) * scale + yOffset),
  });

  const basePath = coords.map((pt, i) => {
    const { x, y } = project(pt);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ') + ' Z';

  let overlayPath = null;
  if (overlayRaw?.type === 'Feature' && overlayRaw.geometry?.type === 'Polygon') {
    const overlayCoords = overlayRaw.geometry.coordinates?.[0] || [];
    overlayPath = overlayCoords.map((pt, i) => {
      const { x, y } = project(pt);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ') + ' Z';
  }

  return (
    <svg viewBox={`0 0 ${boxSize} ${boxSize}`} className="w-64 h-64 bg-white border rounded shadow mx-auto">
      {/* Full field boundary = RED if overlay exists */}
      <path d={basePath} fill={overlayPath ? '#F87171' : '#34D399'} fillOpacity={0.4} stroke="#4B5563" strokeWidth="1.5" />

      {/* Application area (polygon) = GREEN */}
      {overlayPath && (
        <path d={overlayPath} fill="#34D399" fillOpacity={0.6} stroke="#047857" strokeWidth="2" />
      )}
    </svg>
  );
}




 const handleSaveJob = async () => {
  setSaving(true);
// use the state value instead

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

 const updatedFieldsWithAcres = updatedFields.map(f => {
  let polygon = f.drawnPolygon;

  if (polygon && typeof polygon === 'object' && polygon.type === 'Feature') {
    polygon = JSON.stringify(polygon);
  }

  return {
    ...f,
    drawnPolygon: polygon ?? null,
    acres: f.drawnAcres ?? f.gpsAcres ?? 0,
    riceLeveeAcres: f?.riceLeveeAcres ?? null,
    beanLeveeAcres: f?.beanLeveeAcres ?? null
  };
});




const cleanedProducts = editableProducts.map(p => ({
  productId: p.productId || '',
  productName: p.productName || '',
  rate: p.rate || '',
  unit: p.unit || '',
  crop: p.crop || '',
  rateType: p.rateType || ''
}));


  const masterJob = {
  jobId,
  jobType: {
    name: jobType.name,
    icon: jobType.icon || '',
    cost: jobType.cost || 0,
    parentName: jobType.parentName || ''
  },
...(jobType?.parentName === 'Tillage' ? { passes: parseInt(passes) || 1 } : {}),
  vendor: vendor || '',
  applicator: applicator || '',
  products: cleanedProducts,
  cropYear,
  jobDate: jobDate || new Date().toISOString().split('T')[0],
  status: jobStatus,
  fieldIds: updatedFieldsWithAcres.map(f => f.id),
  waterVolume: jobType?.parentName === 'Spraying' ? waterVolume : '',
  fields: updatedFieldsWithAcres,
  acres: Object.fromEntries(updatedFieldsWithAcres.map(f => [f.id, f.acres])),
  notes,
  timestamp: serverTimestamp()
};


console.log('📦 Saving master job:', masterJob);

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
      vendor: vendor || '',
      applicator: applicator || '',
...(() => {
  const crop = field.crop || field.crops?.[cropYear]?.crop || '';
  if (crop.includes('Rice')) {
    return { riceLeveeAcres: field.riceLeveeAcres ?? null };
  }
  if (crop.includes('Soybean')) {
    return { beanLeveeAcres: field.beanLeveeAcres ?? null };
  }
  return {};
})(),


     jobType: {
  name: jobType.name,
  icon: jobType.icon || '',
  cost: jobType.cost || 0,
  parentName: jobType.parentName || ''
},
  ...(jobType?.parentName === 'Tillage' ? { passes: parseInt(passes) || 1 } : {}),
 // 👈 here

      jobDate: jobDate || new Date().toISOString().split('T')[0],
      notes,

      products: cleanedProducts,

      waterVolume: requiresWater ? waterVolume : '',
      timestamp: serverTimestamp()
    };
console.log('💾 jobEntry:', jobEntry);
    return setDoc(doc(db, 'jobsByField', `${jobId}_${field.id}`), jobEntry);
  });

  await Promise.all(jobsByFieldPromises);

const jobObj = {
  ...masterJob,
  operator: updatedFieldsWithAcres[0]?.operator || '',
  fields: updatedFieldsWithAcres,
  acres: Object.fromEntries(updatedFieldsWithAcres.map(f => [f.id, f.acres]))
};


    if (shouldGeneratePDF) {
  try {
    const { generatePDFBlob } = await import('../utils/generatePDF');
    const blob = await generatePDFBlob(jobObj);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `JobOrder_${jobType}_${cropYear}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    alert('Job saved, but PDF failed to generate.');
  }
}


    navigate('/jobs');
} catch (error) {
  console.error('🔥 SAVE ERROR:', error);
  alert('Failed to save job.');
}

 finally {
    setSaving(false);
  }
};



if (!jobTypesList.length) return null;


return (
    <div className="p-6">
     

      {/* Inputs and product selectors */}
      <div className="mb-4">
        <label className="block text-sm font-medium">Job Type</label>
       {jobTypesList.length > 0 && (
 <select
  value={jobType?.name || ''}
  onChange={e => {
    const selected = jobTypesList.find(t => t.name === e.target.value);
    setJobType(selected || '');
  }}
  className="border border-gray-300 rounded-md px-3 py-2 bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <option value="">Select Job Type</option>
  {jobTypesList.map(type => (
    <option key={type.name} value={type.name}>
      {type.name} {type.parentName ? `(${type.parentName})` : ''}
    </option>
  ))}
</select>

)}

      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">Job Date</label>
          <input type="date" value={jobDate} onChange={e => setJobDate(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <div>
          <label className="block text-sm font-medium">Vendor</label>
          <select value={vendor} onChange={e => setVendor(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select Vendor</option>
            {vendors.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Applicator</label>
         <select
  value={applicator}
  onChange={e => setApplicator(e.target.value)}
  className="border border-gray-300 rounded-md px-3 py-2 bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <option value="">Select Applicator</option>
  {applicators.map(a => (
    <option key={a} value={a}>{a}</option>
  ))}
</select>

          <div className="mb-4">
  <label className="block text-sm font-medium">Job Status</label>
  <select
    value={jobStatus}
    onChange={(e) => setJobStatus(e.target.value)}
    className="border border-gray-300 rounded-md px-3 py-2 bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
  
    <option value="Planned">Planned</option>
<option value="Completed">Completed</option>
  </select>
</div>

        </div>
      </div>

     {requiresProducts && editableProducts.map((p, i) => (
<div
  key={i}
  className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3 items-center"
>

    <ProductComboBox
  productType={selectedProductType}
allProducts={productsList.filter(p => {
  const parent = jobType?.parentName;
  if (parent === 'Seeding') return p.type === 'Seed';
  if (parent === 'Spraying') return p.type === 'Chemical';
  if (parent === 'Fertilizer') return p.type === 'Fertilizer';
  return true; // fallback if no match
})}


usedProductIds={usedProductIds}
  value={{
  id: p.productId,
  name: p.productName
}}

onChange={(selected) => {
  handleProductChange(i, 'productId', selected.id);
  handleProductChange(i, 'productName', selected.name);
  handleProductChange(i, 'crop', selected.crop || '');

  // ✅ Only set clean units based on rateType
  const rateType = selected?.rateType?.toLowerCase();
  const cleanUnit =
    rateType === 'weight'
      ? 'lbs/acre'
      : rateType === 'population'
      ? 'seeds/acre'
      : selected.unit || '';

  handleProductChange(i, 'unit', cleanUnit);
  handleProductChange(i, 'rateType', selected.rateType || '');
}}

/>

    <input
      type="number"
      placeholder="Rate"
className="border border-gray-300 rounded-md px-3 py-2 bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={p.rate}
      onChange={e => handleProductChange(i, 'rate', e.target.value)}
    />
    <select
  className="border p-2 rounded w-full"
  value={p.unit}
  onChange={(e) => handleProductChange(i, 'unit', e.target.value)}
>
  <option value="">Select Unit</option>

  {/* Include current product's unit if it's not already listed */}
  {![
    'oz/acre',
    'pt/acre',
    'qt/acre',
    'gal/acre',
    'lbs/acre',
    'seeds/acre',
    'units/acre'
  ].includes(p.unit) && p.unit && (
    <option value={p.unit}>{p.unit}</option>
  )}

 <option value="fl oz/acre">fl oz/acre</option>
<option value="pt/acre">pt/acre</option>
<option value="qt/acre">qt/acre</option>
<option value="gal/acre">gal/acre</option>
<option value="lbs/acre">lbs/acre</option>
<option value="oz dry/acre">oz dry/acre</option> {/* 👈 for dry stuff like Sharpen */}
<option value="tons/acre">tons/acre</option>
<option value="seeds/acre">seeds/acre</option>
<option value="units/acre">units/acre</option>
<option value="%v/v">%V/V</option>

</select>

   <button
  className={redLinkBtn}

      onClick={() =>
        setEditableProducts(prev => prev.filter((_, idx) => idx !== i))
      }
    >
      🗑️ Remove
    </button>
  </div>
))}

{requiresProducts && (
  <button
    onClick={handleAddProduct}
    className="text-sm bg-blue-600 text-white px-3 py-1 rounded shadow hover:bg-blue-700 transition mb-4"
  >
    + Add Product
  </button>
)}

{jobType?.parentName === 'Tillage' && (
  <div className="mb-4">
    <label className="block text-sm font-medium">Number of Passes</label>
    <input
      type="number"
      min={1}
      value={passes}
      onChange={(e) => setPasses(e.target.value)}
      className="border border-gray-300 rounded-md px-3 py-2 w-32 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>
)}

    {jobType?.parentName === 'Spraying' && (
  <div className="mb-4">
    <label className="block text-sm font-medium">Water Volume (gal/acre)</label>
    <input
      type="number"
      className="border rounded p-2 w-48"
      value={waterVolume}
      onChange={e => setWaterVolume(e.target.value)}
    />
  </div>
)}

<div className="mb-6">
<h3 className="text-lg font-semibold mb-2">
  Fields ({fields.length}) – {totalJobAcres.toFixed(2)} acres total
</h3>



  {fields.map((field) => {

  // rest of your render logic

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
  <div key={field.id} className="border border-gray-300 rounded-xl bg-white p-4 shadow-sm mb-6">

<p>
  <strong>{field.fieldName}</strong> –{' '}
  {isLeveeJob
    ? `${((field.crop || field.crops?.[cropYear]?.crop || '').includes('Rice')
        ? field.riceLeveeAcres
        : field.beanLeveeAcres) || 0} acres (Levee – ${field.crop || field.crops?.[cropYear]?.crop || '—'})`
    : `${Number(displayAcres).toFixed(2)} acres – ${isPartial ? 'partial' : 'full'}`}
</p>

  <p>Crop: {crop}</p>

     <div
  id={`field-canvas-${field.id}`}
  className="bg-white p-2 rounded border shadow-sm mt-4"
  style={{ width: 'fit-content', margin: '0 auto' }}
>


{renderBoundarySVG(parsedGeo, field.drawnPolygon)}



</div>


      <div className="flex justify-between items-center mt-2 no-print">
        <button
className={blueLinkBtn}
          onClick={() =>
       navigate(`/jobs/edit-area/${field.id}`, {
  state: {
    field, // 👈 this line is required
    selectedFields: fields,
    drawnPolygon: field.drawnPolygon,
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
className={blueLinkBtn}
          onClick={() => setFields(prev => prev.filter(f => f.id !== field.id))}
        >
          ❌ Remove Field
        </button>
      </div>
    </div>
  );
})}

</div>
<div className="mt-6">
  <label className="block text-sm font-medium mb-1">Notes</label>
  <textarea
    value={notes}
    onChange={e => setNotes(e.target.value)}
    className="w-full border border-gray-300 rounded-md p-2 text-sm resize-none"
    rows={4}
    placeholder="Add any notes for this job..."
  />
</div>

{requiresProducts && (
  <div className="mt-6 border-t pt-4">
    <h4 className="font-semibold text-sm mb-2">Product Totals</h4>
    {editableProducts.map((p, i) => {
  const rate = parseFloat(p.rate);
  const unit = p.unit?.toLowerCase() || '';
  const crop = p.crop?.toLowerCase?.() || '';
  const acres = fields.reduce((sum, f) => {
  if (isLeveeJob) {
    const crop = f.crop || f.crops?.[cropYear]?.crop || '';
    if (crop.includes('Rice') && f.riceLeveeAcres) return sum + parseFloat(f.riceLeveeAcres);
    if (crop.includes('Soybean') && f.beanLeveeAcres) return sum + parseFloat(f.beanLeveeAcres);
  }
  return sum + (f.drawnAcres ?? f.gpsAcres ?? 0);
}, 0);

  const totalAmount = rate * acres;
  let display = '';

  if (['seeds/acre', 'population'].includes(unit)) {
    const seedsPerUnit = crop.includes('rice') ? 900000 : crop.includes('soybean') ? 140000 : 1000000;
    const totalSeeds = rate * acres;
    const units = totalSeeds / seedsPerUnit;
    display = `${units.toFixed(1)} units (${seedsPerUnit.toLocaleString()} seeds/unit)`;
  } else if (['lbs/acre'].includes(unit)) {
    const lbsPerBushel = crop.includes('rice') ? 45 : crop.includes('soybean') ? 60 : 50;
    const bushels = totalAmount / lbsPerBushel;
    display = `${bushels.toFixed(1)} bushels`;
  } else if (['fl oz/acre', 'oz/acre'].includes(unit)) {
    const gal = totalAmount / 128;
    display = `${gal.toFixed(2)} gallons`;
  } else if (unit === 'pt/acre') {
    const gal = totalAmount / 8;
    display = `${gal.toFixed(2)} gallons`;
  } else if (unit === 'qt/acre') {
    const gal = totalAmount / 4;
    display = `${gal.toFixed(2)} gallons`;
  } else if (unit === 'oz dry/acre') {
    const lbs = totalAmount / 16;
    display = `${lbs.toFixed(2)} lbs`;
    } else if (unit === '%v/v') {
  const water = parseFloat(waterVolume || 0);
  const gal = (rate / 100) * water * acres;
  display = `${gal.toFixed(2)} gallons`;

  } else if (unit === 'tons/acre') {
    display = `${totalAmount.toFixed(2)} tons`;
  } else {
    display = `${totalAmount.toFixed(1)} ${unit.replace('/acre', '').trim()}`;
  }

  return (
    <div key={i} className="text-sm text-gray-700">
      {p.productName || p.name || 'Unnamed'} → <span className="font-mono">{display}</span>
    </div>
  );
})}

  </div>
)}


      <div className="flex justify-between items-center">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={shouldGeneratePDF} onChange={() => setShouldGeneratePDF(!shouldGeneratePDF)} />
          <span>Generate PDF after saving</span>
        </label>
        <button
className={primaryBtn}
  onClick={handleSaveJob}
  disabled={saving}
>
 {saving
  ? 'Saving...'
  : isEditing
    ? 'Update Job'
    : 'Save Final Job'}

</button>

      </div>
    </div>
  );
}

export default JobSummaryPage;
