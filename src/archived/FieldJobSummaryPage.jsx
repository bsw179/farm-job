// FieldJobSummaryPage.jsx — allows editing of a single jobsByField job without touching the master job
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  setDoc,
  deleteDoc,              // ✅ Add this here
  serverTimestamp         // ✅ You can move this up to combine
} from 'firebase/firestore';
import EditAreaModal from "../components/EditAreaModal";
import EditJobPolygonForFieldJob from "./EditJobPolygonForFieldJob";
import html2canvas from 'html2canvas';
import ProductComboBox from '../components/ProductComboBox';

function FieldJobSummaryPage() {
  const redLinkBtn = "text-red-600 hover:text-red-800 underline text-sm";

  const { jobId } = useParams();
  const navigate = useNavigate();
const [field, setField] = useState(null);
const [notes, setNotes] = useState('');

  const [job, setJob] = useState(null);
  const [jobType, setJobType] = useState(null);

  const [usedProductIds, setUsedProductIds] = useState([]);

  const [productsList, setProductsList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [applicators, setApplicators] = useState([]);
  const [generatePdf, setGeneratePdf] = useState(false);
  const [originalJob, setOriginalJob] = useState(null);
const [fieldBoundary, setFieldBoundary] = useState(null);
const [waterVolume, setWaterVolume] = useState(null);
const [jobTypesList, setJobTypesList] = useState([]);
const [passes, setPasses] = useState(1);
const [jobStatus, setJobStatus] = useState('Planned');
const [vendor, setVendor] = useState('');
const [applicator, setApplicator] = useState('');
const [showEditAreaModal, setShowEditAreaModal] = useState(false);
const [fieldToEdit, setFieldToEdit] = useState(null);
const [seedTreatmentStatus, setSeedTreatmentStatus] = useState('');
const [seedTreatments, setSeedTreatments] = useState([]);
const [productVendors, setProductVendors] = useState([]);

const isLeveeJob = job?.jobType?.name?.toLowerCase().includes('levee') || job?.jobType?.name?.toLowerCase().includes('pack');
const handleProductChange = (index, field, value) => {
  setJob(prev => {
    const updatedProducts = [...prev.products];
    updatedProducts[index][field] = value;
    return { ...prev, products: updatedProducts };
  });
};

const getJobTypeName = (job) =>
  typeof job.jobType === 'string' ? job.jobType : job.jobType?.name || '';
useEffect(() => {
  console.log("🌾 Loaded Field Boundary:", fieldBoundary);
}, [fieldBoundary]);

const fetchUpdatedFieldJob = async () => {
  const jobSnap = await getDoc(doc(db, 'jobsByField', jobId));
  if (jobSnap.exists()) {
    const jobData = { id: jobSnap.id, ...jobSnap.data() };

    const parsedPolygon = typeof jobData.drawnPolygon === 'string'
      ? JSON.parse(jobData.drawnPolygon)
      : jobData.drawnPolygon;

    const normalizedJobType = typeof jobData.jobType === 'string'
      ? { name: jobData.jobType }
      : jobData.jobType;


setJob({
  ...jobData,
  jobType: normalizedJobType,
  drawnPolygon: parsedPolygon,
});



  }
};

const handleCloseEditAreaModal = async () => {
  await fetchUpdatedFieldJob();
  setShowEditAreaModal(false);
};

useEffect(() => {
  const loadJobTypes = async () => {
    const snap = await getDocs(collection(db, 'jobTypes'));

    const rawTypes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const flattenedTypes = rawTypes.flatMap((type) =>
      (type.subTypes || []).map(sub => ({
        ...sub,
        parentName: type.name
      }))
    );

    setJobTypesList(flattenedTypes);
  };

  loadJobTypes();
}, []);

useEffect(() => {
  if (job) {
    setJobStatus(job.status || 'Planned');
    setJobType(job.jobType || null);
    setVendor(job.vendor || '');
    setApplicator(job.applicator || '');
    setProductVendors((job.products || []).map(p => p.vendorName || ''));

    // ❌ DO NOT setEditableProducts here anymore
  }
}, [job]);


useEffect(() => {
  if (job?.jobType) {
    setJobType(job.jobType);
  }
}, [job]);

  useEffect(() => {
  const loadVendorsAndApplicators = async () => {
    const [vendorSnap, applicatorSnap] = await Promise.all([
      getDocs(collection(db, 'vendors')),
      getDocs(collection(db, 'applicators'))
    ]);
    setVendors(vendorSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    setApplicators(applicatorSnap.docs.map(doc => doc.data().name));
  };

  loadVendorsAndApplicators();
}, []);
useEffect(() => {
  const fetchUsedProducts = async () => {
    const snap = await getDocs(collection(db, 'usedProducts'));
    const ids = snap.docs.map(doc => doc.data().productId);
    setUsedProductIds(ids.filter(Boolean));
  };

  fetchUsedProducts();
}, []);



 useEffect(() => {
  const fetchData = async () => {
    const jobSnap = await getDoc(doc(db, 'jobsByField', jobId));
    if (jobSnap.exists()) {
      console.log('🔥 LOADING JOB FROM FIRESTORE:', jobId);

      const jobData = { id: jobSnap.id, ...jobSnap.data() };
      setPasses(jobData.passes || 1);

      const parsedPolygon = typeof jobData.drawnPolygon === 'string'
        ? JSON.parse(jobData.drawnPolygon)
        : jobData.drawnPolygon;

      const normalizedJobType = typeof jobData.jobType === 'string'
        ? { name: jobData.jobType }
        : jobData.jobType;

      setJob({
        ...jobData,
        jobType: normalizedJobType,
        drawnPolygon: parsedPolygon,
      });
setSeedTreatmentStatus(jobData.seedTreatmentStatus || '');
setSeedTreatments((jobData.products || []).filter(p => (p.type || '').toLowerCase() === 'seed treatment'));

      setNotes(jobData.notes || '');
      setWaterVolume(jobData.waterVolume || 0);
      setOriginalJob(jobData);

      // 👇 Fetch the full field boundary based on fieldId
      const fieldSnap = await getDoc(doc(db, 'fields', jobData.fieldId));
      if (fieldSnap.exists()) {
        const fieldData = { id: fieldSnap.id, ...fieldSnap.data() };
        setField(fieldData);

        // 🛠️ Parse geojson safely
        let geo = null;

        if (fieldData.boundary?.geojson) {
          try {
            geo = typeof fieldData.boundary.geojson === 'string'
              ? JSON.parse(fieldData.boundary.geojson)
              : fieldData.boundary.geojson;
          } catch {
            geo = null;
          }
        }

        setFieldBoundary(geo);

        if (fieldData?.crop) {
          setJob(prev => ({
            ...prev,
            crop: fieldData.crop
          }));
        }
      }
    }

    const productsSnap = await getDocs(collection(db, 'products'));
    setProductsList(productsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const updated = location.state?.updatedField;

  if (updated) {
    console.log('📥 Applying updatedField from location.state:', updated);

    const parsedPolygon = typeof updated.drawnPolygon === 'string'
      ? JSON.parse(updated.drawnPolygon)
      : updated.drawnPolygon;

    setJob(prev => ({
      ...prev,
      drawnPolygon: parsedPolygon,
      drawnAcres: updated.drawnAcres,
      acres: updated.drawnAcres
    }));
  } else {
    console.log('🔥 No updatedField — reloading job from Firestore:', jobId);
    fetchData();
  }
}, [location.key]);


useEffect(() => {
  const updated = location.state?.updatedField;
  if (updated) {
    console.log('📥 Applying updatedField from location.state:', updated);

    const parsedPolygon = typeof updated.drawnPolygon === 'string'
      ? JSON.parse(updated.drawnPolygon)
      : updated.drawnPolygon;

    setJob(prev => ({
      ...prev,
      drawnPolygon: parsedPolygon,
      drawnAcres: updated.drawnAcres,
      acres: updated.drawnAcres
    }));
  }
}, [location.state]);






  


 const handleSave = async () => {
  setSaving(true);

  if (seedTreatmentStatus === 'separate') {
    const missing = seedTreatments.find(t => !t.productId || !t.rate || !t.unit);
    if (missing) {
      alert('Please fill out all seed treatment fields (product, rate, and unit).');
      setSaving(false);
      return;
    }
  }

  const cleanedDrawnPolygon = typeof job.drawnPolygon === 'object'
    ? JSON.stringify(job.drawnPolygon)
    : job.drawnPolygon;

  // ✅ Override GPS/drawn acres with levee acres if applicable
 const isLeveeJob =
  job?.jobType?.name?.toLowerCase().includes('levee') ||
  job?.jobType?.name?.toLowerCase().includes('pack');

const leveeAcres =
  isLeveeJob && (job.crop || '').toLowerCase().includes('rice') && field?.riceLeveeAcres != null
    ? Number(field.riceLeveeAcres)
    : isLeveeJob && (job.crop || '').toLowerCase().includes('soybean') && field?.beanLeveeAcres != null
    ? Number(field.beanLeveeAcres)
    : null;

const finalAcres = leveeAcres ?? job.drawnAcres ?? job.acres ?? 0;


  try {
    const newFieldJobRef = doc(collection(db, 'jobsByField'));

    const expenseSplit = job.expenseSplit || {
      operator: job.operator || field?.operator || '',
      operatorShare: typeof job.operatorExpenseShare === 'number' ? job.operatorExpenseShare : 100,
      landowner: job.landowner || field?.landowner || '',
      landownerShare: typeof job.landownerExpenseShare === 'number' ? job.landownerExpenseShare : 0
    };

    await setDoc(newFieldJobRef, {
      ...job,
      farmName: field?.farmName || '',
      farmNumber: field?.farmNumber || '',
      tractNumber: field?.tractNumber || '',
      fsaFieldNumber: field?.fsaFieldNumber || '',
      gpsAcres: field?.gpsAcres ?? null,
      fsaAcres: field?.fsaAcres ?? null,
      county: field?.county || '',

      id: newFieldJobRef.id,
      status: job.status || 'Planned',
      jobType,
      vendor: job.vendor || '',
      applicator: job.applicator || '',
    products: [
  ...(job.products || [])
    .filter(p => (p.type || '').toLowerCase() !== 'seed treatment')
    .map(p => ({
      productId: p.productId || '',
      productName: p.productName || '',
      type: p.type || '',
      rate: p.rate || '',
      unit: p.unit || '',
      rateType: p.rateType || '',
      crop: p.crop || '',
      vendorId: p.vendorId || '',
      vendorName: p.vendorName || '',
      unitSize: p.unitSize || '',
      seedsPerUnit: p.seedsPerUnit || '',
      form: p.form || '',
      npk: p.npk || '',
      ai: p.ai || ''
    })),
  ...(seedTreatmentStatus === 'separate'
    ? seedTreatments.map(p => ({
        productId: p.productId || '',
        productName: p.productName || '',
        type: 'Seed Treatment',
        rate: p.rate || '',
        unit: p.unit || '',
        rateType: p.rateType || '',
        vendorId: p.vendorId || '',
        vendorName: p.vendorName || '',
        unitSize: p.unitSize || '',
        seedsPerUnit: p.seedsPerUnit || '',
        form: p.form || '',
        npk: p.npk || '',
        ai: p.ai || ''
      }))
    : [])
],


      seedTreatmentStatus: seedTreatmentStatus || '',
      operator: expenseSplit.operator,
      landowner: expenseSplit.landowner,
      operatorExpenseShare: expenseSplit.operatorShare,
      landownerExpenseShare: expenseSplit.landownerShare,
      operatorRentShare: job.operatorRentShare ?? field?.operatorRentShare ?? null,
      landownerRentShare: job.landownerRentShare ?? field?.landownerRentShare ?? null,
      county: job.county || field?.county || '',
      expenseSplit,
      notes: notes || '',
      ...(job?.jobType?.parentName === 'Tillage' ? { passes: parseInt(passes) || 1 } : {}),
      waterVolume: job?.jobType?.parentName === 'Spraying' ? waterVolume : '',
      drawnPolygon: cleanedDrawnPolygon,
      drawnAcres: job.drawnAcres ?? null,
      acres: finalAcres,
      linkedToJobId: null,
      isDetachedFromGroup: true,
      timestamp: serverTimestamp()
    });



    // 🧹 Delete old jobsByField doc
    await deleteDoc(doc(db, 'jobsByField', job.id));

    // 🧹 Update or delete grouped job
    if (job.linkedToJobId) {
      const groupRef = doc(db, 'jobs', job.linkedToJobId);
      const groupSnap = await getDoc(groupRef);

      if (groupSnap.exists()) {
        const groupData = groupSnap.data();
        const remainingFields = (groupData.fields || []).filter(f => f.id !== job.fieldId);

        if (remainingFields.length === 1) {
          const lastFieldId = remainingFields[0].fieldId;

          const lastFieldDoc = doc(db, 'jobsByField', `${job.linkedToJobId}_${lastFieldId}`);
          await updateDoc(lastFieldDoc, {
            linkedToJobId: null,
            isDetachedFromGroup: true
          });
          await deleteDoc(groupRef);
        } else {
          await setDoc(groupRef, {
            ...groupData,
            fields: remainingFields
          });
        }
      }
    }

    if (generatePdf) {
      try {
        // Capture map image
const canvasElement = document.getElementById(`field-canvas-${job.fieldId}`);
let imageBase64 = null;

if (canvasElement) {
  const buttons = canvasElement.querySelectorAll('.no-print');
  buttons.forEach(btn => btn.style.display = 'none');

  const canvas = await html2canvas(canvasElement);
  imageBase64 = canvas.toDataURL('image/png');

  buttons.forEach(btn => btn.style.display = '');
}

        const { generatePDFBlob } = await import('../utils/generatePDF');
        const fieldSnap = await getDoc(doc(db, 'fields', job.fieldId));
        const fieldData = fieldSnap.exists() ? fieldSnap.data() : {};

        const fullJob = {
          ...job,
          notes,
    fields: [
  {
    id: job.fieldId,
    fieldName: job.fieldName,
    acres: job.acres,
    drawnAcres: job.drawnAcres,
    drawnPolygon: job.drawnPolygon,
    imageBase64,
    operator: job.operator || '',
    landowner: job.landowner || '',
    operatorExpenseShare: typeof job.operatorExpenseShare === 'number' ? job.operatorExpenseShare : undefined,
    landownerExpenseShare: typeof job.landownerExpenseShare === 'number' ? job.landownerExpenseShare : undefined,
    ...fieldData,
  }
],


          acres: { [job.fieldId]: job.acres },
          fieldIds: [job.fieldId],
        };

        const blob = await generatePDFBlob(fullJob);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `FieldJob_${job.fieldName || job.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error('PDF generation failed:', err);
        alert('Job saved, but PDF failed to generate.');
      }
    }

navigate('/jobs');



  } catch (err) {
    console.error('Error saving field job:', err);
    alert('Failed to save changes.');
    setSaving(false);
    return;
  }
};






  function renderBoundarySVG(baseGeometry, overlayGeoJSON) {
  if (!baseGeometry) return null;

  let base = baseGeometry;
  if (base.type === 'Feature') base = base.geometry;
  if (base.type !== 'Polygon' || !base.coordinates?.[0]) return null;

  const baseCoords = base.coordinates[0];

  const bounds = baseCoords.reduce((acc, [lng, lat]) => ({
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

  const pathFromCoords = (coords) => {
    return coords.map((pt, i) => {
      const { x, y } = project(pt);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ') + ' Z';
  };

  const basePath = pathFromCoords(baseCoords);

  let overlayPaths = [];
  if (overlayGeoJSON?.type === 'FeatureCollection') {
    overlayPaths = overlayGeoJSON.features
      .filter(f => f.geometry?.type === 'Polygon')
      .map(f => pathFromCoords(f.geometry.coordinates[0]));
  } else if (overlayGeoJSON?.type === 'Feature' && overlayGeoJSON.geometry?.type === 'Polygon') {
    overlayPaths = [pathFromCoords(overlayGeoJSON.geometry.coordinates[0])];
  } else if (overlayGeoJSON?.type === 'Polygon') {
    overlayPaths = [pathFromCoords(overlayGeoJSON.coordinates[0])];
  }

  return (
    <svg viewBox={`0 0 ${boxSize} ${boxSize}`} className="w-64 h-64 bg-white border rounded shadow mx-auto">
      {/* Base field = red if overlay exists */}
      <path d={basePath} fill={overlayPaths.length ? '#F87171' : '#34D399'} fillOpacity={0.4} stroke="#4B5563" strokeWidth="1.5" />
      
      {/* Overlay polygons = green */}
      {overlayPaths.map((d, i) => (
        <path key={i} d={d} fill="#34D399" fillOpacity={0.6} stroke="#047857" strokeWidth="2" />
      ))}
    </svg>
  );
}

  if (!job || !fieldBoundary) {
  return <div className="p-6">Loading Field Data...</div>;
}


const requiresProducts = ['Seeding', 'Spraying', 'Fertilizing'].includes(
  job.jobType?.parentName
);

const requiresWater = job.jobType?.parentName === 'Spraying';


 return (
  <div className="px-4 py-6 max-w-full overflow-x-hidden">

     <h2 className="text-xl font-bold mb-4">Edit Field Job – {job.fieldName}</h2>
<div className="mb-4">
  <label className="block text-sm font-medium">Job Type</label>
<select
  value={job.jobType?.name || ''}
  disabled={true}  // 🚫 Lock it down
  onChange={(e) => {}}  // 🚫 No-op onChange
  className="border border-gray-300 rounded-md px-3 py-2 bg-gray-100 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-not-allowed"
>

  <option value="">Select Job Type</option>
  {jobTypesList.map(type => (
    <option key={type.name} value={type.name}>
      {type.name} {type.parentName ? `(${type.parentName})` : ''}
    </option>
  ))}
</select>


</div>

<div className="mb-4 flex gap-4">
  {/* Vendor dropdown and apply-to-all */}
  <div className="flex flex-col gap-1">
    <label className="block text-sm font-medium text-gray-700">Vendor</label>

    <select
      className="border p-2 rounded"
      value={job.vendor || ''}
      onChange={e => setJob(prev => ({ ...prev, vendor: e.target.value }))}
    >
      <option value="">Select Vendor</option>
      {vendors.map(v => (
        <option key={v.id} value={v.name}>{v.name}</option>
      ))}
    </select>

  <button
  type="button"
  onClick={() => {
    const name = job.vendor || '';
    const selectedVendor = vendors.find(v => v.name === name);
    const id = selectedVendor?.id || '';

    setProductVendors(job.products.map(() => name));
    setJob(prev => ({
      ...prev,
      products: prev.products.map(p => ({
        ...p,
        vendorName: name,
        vendorId: id
      }))
    }));
  }}
  className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition w-fit self-start"
>
  Apply Vendor to All Products
</button>

  </div>

  {/* Leave this open so the next applicator dropdown fits here */}
  <div className="mb-4 flex gap-4">

  
  {/* Applicator dropdown */}
</div>

<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700">Job Date</label>
  <input
    type="date"
    className="border p-2 rounded"
    value={job.jobDate || ''}
    onChange={e => setJob(prev => ({ ...prev, jobDate: e.target.value }))}
  />
</div>


<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700">Job Status</label>
  <select
    className="border p-2 rounded"
    value={job.status || 'Planned'}
    onChange={e => setJob(prev => ({ ...prev, status: e.target.value }))}
  >
    <option value="Planned">Planned</option>
    <option value="Completed">Completed</option>
  </select>
</div>

  <div>
    <label className="block text-sm font-medium text-gray-700">Applicator</label>
    <select
      className="border p-2 rounded"
      value={job.applicator || ''}
      onChange={e => setJob(prev => ({ ...prev, applicator: e.target.value }))}
    >
      <option value="">Select Applicator</option>
      {applicators.map(a => (
        <option key={a} value={a}>{a}</option>
      ))}
    </select>
  </div>
</div>

<p className="mb-2 text-sm text-gray-500">
  {job.jobType?.name} • {job.cropYear} •{' '}
  {isLeveeJob
    ? `${((job.crop || '').toLowerCase().includes('rice') ? field?.riceLeveeAcres
      : field?.beanLeveeAcres) ?? 0} levee acres`
    : `${(job.drawnAcres ?? job.acres)?.toFixed(2)} acres`}
</p>



<div className="mb-6">
  <div className="grid grid-cols-3 font-semibold border-b pb-1 mb-1">
    <span>Product</span>
    <span>Rate</span>
    <span>Units</span>
  </div>

        {job.products
  .filter(p => (p.type || '').toLowerCase() !== 'seed treatment')
  .map((p, i) => (

<div
  key={i}
  className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2"
>
       <ProductComboBox
  productType={job?.jobType?.productType}
  allProducts={productsList
    .filter(prod => {
      const parent = job?.jobType?.parentName;
      if (parent === 'Seeding') return prod.type === 'Seed';
      if (parent === 'Spraying') return prod.type === 'Chemical';
      if (parent === 'Fertilizing') return prod.type === 'Fertilizer';
      return true;
    })
    .sort((a, b) => {
      const aUsed = usedProductIds.includes(a.id);
      const bUsed = usedProductIds.includes(b.id);
      if (aUsed && !bUsed) return -1;
      if (!aUsed && bUsed) return 1;
      return (a.name || '').localeCompare(b.name || '');
    })
  }
  usedProductIds={usedProductIds}
  value={{ id: p.productId, name: p.productName }}
  onChange={(selected) => {
    handleProductChange(i, 'productId', selected.id);
    handleProductChange(i, 'productName', selected.name);
    handleProductChange(i, 'crop', selected.crop || '');
    handleProductChange(i, 'unit', selected.unit || '');
    handleProductChange(i, 'rateType', selected.rateType || '');
    handleProductChange(i, 'type', selected.type || '');
  }}
/>



<input
  type="text"
  className="border p-1 rounded"
  value={p.rate || ''}
  onChange={e => handleProductChange(i, 'rate', e.target.value)}
/>


  

{(() => {
  const rateType = p.rateType?.toLowerCase() || '';

 let unitOptions = [
  "oz/acre",
  "pt/acre",
  "qt/acre",
  "gal/acre",
  "lbs/acre",
  "seeds/acre",
  "%v/v"
];



  if (rateType === 'weight') {
    unitOptions = ['lbs/acre'];
  } else if (rateType === 'population') {
    unitOptions = ['seeds/acre'];
  }

  return (
   <select
  className="border p-2 rounded"
  value={p.unit}
  onChange={async (e) => {
    const newUnit = e.target.value;
    const oldUnit = p.unit;

    handleProductChange(i, 'unit', newUnit);

    if (newUnit !== oldUnit) {
      const confirmUpdate = window.confirm("Update Product's Unit in Database?");
      if (confirmUpdate) {
        console.log('Updating productId:', p.productId, 'New Unit:', newUnit);
        try {
          await updateProductUnit(p.productId, newUnit);
          alert("Product unit updated successfully.");
        } catch (error) {
          console.error("Failed to update unit:", error);
          alert("Failed to update product unit.");
        }
      }
    }
  }}
>
  <option value="">Select Unit</option>
  {[
    'fl oz/acre', 'pt/acre', 'qt/acre', 'gal/acre',
    'lbs/acre', 'oz dry/acre', 'tons/acre',
    'seeds/acre', 'units/acre', '%v/v'
  ].map(unit => (
    <option key={unit} value={unit}>{unit}</option>
  ))}
</select>

  );
})()}

{/* Vendor dropdown */}
<select
  className="border p-2 rounded w-full"
  value={productVendors[i] || ''}
  onChange={e => {
    const name = e.target.value;
    const updated = [...productVendors];
    updated[i] = name;
    setProductVendors(updated);

    const selectedVendor = vendors.find(v => v.name === name);
    handleProductChange(i, 'vendorName', name);
    handleProductChange(i, 'vendorId', selectedVendor?.id || '');
  }}
>
  <option value="">Select Vendor</option>
  {vendors.map(v => (
    <option key={v.id} value={v.name}>{v.name}</option>
  ))}
</select>
<button
  type="button"
  onClick={() => {
    const updatedProducts = job.products.filter((_, idx) => idx !== i);
    const updatedVendors = productVendors.filter((_, idx) => idx !== i);
    setJob(prev => ({ ...prev, products: updatedProducts }));
    setProductVendors(updatedVendors);
  }}
  className="text-xs px-3 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded shadow-sm"
>
  🗑 Remove Product
</button>

          </div>
          
        ))}

        {requiresProducts && (
  <>
    <button
      onClick={() =>
        setJob(prev => ({
          ...prev,
          products: [...prev.products, { productId: '', productName: '', rate: '', unit: '' }]
        }))
      }
      className="text-sm bg-blue-600 text-white px-3 py-1 rounded shadow hover:bg-blue-700 transition mb-4"
    >
      + Add Product
    </button>
  </>
)}
        {/* 🔹 Seed Treatment Section */}
{job.products?.some(p => (p.type || '').toLowerCase() === 'seed') && (

  <div className="mt-4 border-t pt-4">
    <h4 className="font-semibold text-sm mb-2">Seed Treatment</h4>

    <div className="space-y-2 text-sm">
      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="seedTreatmentStatus"
          value="none"
          checked={seedTreatmentStatus === 'none'}
          onChange={(e) => setSeedTreatmentStatus(e.target.value)}
        />
        No seed treatment applied
      </label>
      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="seedTreatmentStatus"
          value="included"
          checked={seedTreatmentStatus === 'included'}
          onChange={(e) => setSeedTreatmentStatus(e.target.value)}
        />
        Treatment already included with seed
      </label>
      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="seedTreatmentStatus"
          value="separate"
          checked={seedTreatmentStatus === 'separate'}
          onChange={(e) => setSeedTreatmentStatus(e.target.value)}
        />
        Treatment applied and tracked separately
      </label>
    </div>

    {seedTreatmentStatus === 'separate' && (
  <div className="mt-4 space-y-2">
    {seedTreatments.map((t, i) => (
      <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
        <ProductComboBox
          productType="Seed Treatment"
          allProducts={productsList.filter(p => p.type === 'Seed Treatment')}
          usedProductIds={usedProductIds}
          value={{ id: t.productId, name: t.productName }}
          onChange={(selected) => {
            const updated = [...seedTreatments];
            updated[i] = {
              ...updated[i],
              productId: selected.id,
              productName: selected.name,
            };
            setSeedTreatments(updated);
          }}
        />

       <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
  <input
    type="number"
    placeholder="Rate"
    className="border border-gray-300 rounded-md px-2 py-1 w-full"
    value={t.rate || ''}
    onChange={e => {
      const updated = [...seedTreatments];
      updated[i].rate = e.target.value;
      setSeedTreatments(updated);
    }}
  />

  <select
    className="border border-gray-300 rounded-md px-2 py-1 w-full"
    value={t.unit || ''}
    onChange={e => {
      const updated = [...seedTreatments];
      updated[i].unit = e.target.value;
      setSeedTreatments(updated);
    }}
  >
    <option value="">Select Unit</option>
  <option value="/acre">/acre</option>

  </select>
</div>


        <button
          className={redLinkBtn}
          onClick={() => setSeedTreatments(prev => prev.filter((_, idx) => idx !== i))}
        >
          🗑️ Remove
        </button>
      </div>
    ))}

    <button
  onClick={() =>
    setSeedTreatments(prev => [
      ...prev,
      {
        productId: '',
        productName: '',
        type: 'Seed Treatment'  // ✅ include this to avoid re-render bugs
      }
    ])
  }
  className="text-sm bg-blue-600 text-white px-3 py-1 rounded shadow hover:bg-blue-700 transition"
>
  + Add Seed Treatment
</button>

  </div>
)}

  </div>
)}


{job?.jobType?.parentName === 'Tillage' && (
  <div className="mb-4">
    <label className="block text-sm font-medium">Number of Passes</label>
    <input
      type="number"
      min={1}
      value={passes}
      onChange={(e) => setPasses(parseInt(e.target.value) || 1)}
      className="border border-gray-300 rounded-md px-3 py-2 w-32 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>
)}

{requiresWater && (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700">Water Volume (gal/acre)</label>
    <input
      type="number"
      className="border rounded p-2 w-48"
      value={waterVolume}
      onChange={(e) => setWaterVolume(e.target.value)}
    />
  </div>
)}


<div className="border border-gray-300 rounded-xl bg-white p-4 shadow-sm mb-6">



  {field && (
    <>
    <p className="text-sm text-gray-800 mb-1">
  <strong>{job.fieldName}</strong> –{' '}
  {isLeveeJob
    ? `${((job.crop || '').includes('Rice') ? field?.riceLeveeAcres : field?.beanLeveeAcres) || 0} acres (Levee – ${job.crop || '—'})`
    : `${(job.drawnAcres ?? job.acres)?.toFixed?.(2)} acres – ${job.drawnPolygon ? 'partial' : 'full'}`}
</p>
<p className="text-sm text-gray-600 mb-2">
  Crop: {job.crop || '—'}
</p>
{(() => {
  const op = job.operator;
  const lo = job.landowner;
  const opShare = typeof job.operatorExpenseShare === 'number' ? job.operatorExpenseShare : null;
  const loShare = typeof job.landownerExpenseShare === 'number' ? job.landownerExpenseShare : null;

  let split = '';

  if (op && opShare !== null && opShare > 0) {
    split += `${op}: ${opShare}%`;
  }
  if (lo && loShare !== null && loShare > 0) {
    split += `${split ? ' / ' : ''}${lo}: ${loShare}%`;
  }

return (
  <p className="text-sm text-gray-700">
    {split || '⚠️ No split info available'}
  </p>
);})()}


      <div
        id={`field-canvas-${field.id}`}
        className="bg-white p-2 rounded border shadow-sm"
        style={{ width: 'fit-content', margin: '0 auto' }}
      >
      

<div className="mt-4">
  {fieldBoundary ? (
    renderBoundarySVG(fieldBoundary, job?.drawnPolygon)
  ) : (
    <div className="text-center text-gray-400">Loading Map...</div>
  )}
</div>



  </div>


      
      <div className="mt-6">
  <label className="block text-sm font-medium mb-1">Notes</label>
<textarea
  value={job.notes || ''}
  onChange={(e) => setJob(prev => ({ ...prev, notes: e.target.value }))}
    className="w-full border border-gray-300 rounded-md p-2 text-sm resize-none"
    rows={4}
    placeholder="Add any notes for this job..."
  />
</div>

    </>
  )}
</div>



<div className="mt-2 no-print">
  <button
    className="text-sm text-blue-600 underline"
onClick={() => {
  setFieldToEdit({
    id: job.fieldId,
    fieldName: job.fieldName,
    boundary: fieldBoundary,
    drawnPolygon: typeof job.drawnPolygon === 'string'
      ? JSON.parse(job.drawnPolygon)
      : job.drawnPolygon,
    drawnAcres: job.drawnAcres,
    jobId: job.id,
  });
  setShowEditAreaModal(true);
}}
>
  ✏️ Edit Area
</button>

</div>

     </div>

{requiresProducts && (
  <div className="mt-6 border-t pt-4">
    <h4 className="font-semibold text-sm mb-2">Product Totals</h4>
{job.products
  .filter(p => (p.type || '').toLowerCase() !== 'seed treatment')
  .map((p, i) => {

      const requiresWater = job.jobType?.parentName === 'Spraying';
      const rate = parseFloat(p.rate);
      const unit = p.unit?.toLowerCase() || '';
      const crop = p.crop?.toLowerCase?.() || '';
      let acres = job.drawnAcres ?? job.acres ?? 0;
if (isLeveeJob) {
  if ((job.crop || '').includes('Rice') && field?.riceLeveeAcres) {
    acres = parseFloat(field.riceLeveeAcres);
  } else if ((job.crop || '').includes('Soybean') && field?.beanLeveeAcres) {
    acres = parseFloat(field.beanLeveeAcres);
  }
}
const totalAmount = rate * acres;

      if (p.type === 'Seed Treatment' && ['units', 'bushels'].includes(unit)) {
  display = `${rate} ${unit} (matched to seed)`;
}

      let display = '';

      if (['seeds/acre', 'population'].includes(unit)) {
        const seedsPerUnit = crop.includes('rice') ? 900000 : crop.includes('soybean') ? 140000 : 1000000;
        const totalSeeds = rate * acres;
        const units = totalSeeds / seedsPerUnit;
        display = `${units.toFixed(1)} units`;
     } else if (['lbs/acre'].includes(unit)) {
       const totalAmount = rate * acres;
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
        const water = parseFloat(requiresWater ? waterVolume : 0);
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


<label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
  <input
    type="checkbox"
    checked={generatePdf}
    onChange={() => setGeneratePdf(!generatePdf)}
  />
  Generate PDF after saving
</label>

<div className="flex justify-between items-center">
  <button onClick={() => navigate('/jobs')} className="text-blue-600 underline">← Cancel</button>
  <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded" disabled={saving}>
    {saving ? 'Updating...' : 'Update Field Job'}
  </button>
</div>
<EditAreaModal
  isOpen={showEditAreaModal}
  onClose={handleCloseEditAreaModal}
>
  {fieldToEdit && (
    <EditJobPolygonForFieldJob
      field={fieldToEdit}
      onCloseModal={handleCloseEditAreaModal}
    />
  )}
</EditAreaModal>

</div>
);
}

export default FieldJobSummaryPage;



