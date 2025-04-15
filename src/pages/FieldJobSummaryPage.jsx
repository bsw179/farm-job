// FieldJobSummaryPage.jsx — allows editing of a single jobsByField job without touching the master job
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, collection, getDocs, query, where, setDoc } from 'firebase/firestore';

function FieldJobSummaryPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
const [field, setField] = useState(null);

  const [job, setJob] = useState(null);
  const [usedProductIds, setUsedProductIds] = useState([]);

  const [productsList, setProductsList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [applicators, setApplicators] = useState([]);
  const [generatePdf, setGeneratePdf] = useState(false);
  const [originalJob, setOriginalJob] = useState(null);
const [fieldBoundary, setFieldBoundary] = useState(null);

  useEffect(() => {
  const loadVendorsAndApplicators = async () => {
    const [vendorSnap, applicatorSnap] = await Promise.all([
      getDocs(collection(db, 'vendors')),
      getDocs(collection(db, 'applicators'))
    ]);
    setVendors(vendorSnap.docs.map(doc => doc.data().name));
    setApplicators(applicatorSnap.docs.map(doc => doc.data().name));
  };

  loadVendorsAndApplicators();
}, []);
useEffect(() => {
  const loadUsedProducts = async () => {
    if (!job?.jobType || !job?.cropYear) return;

    const q = query(
      collection(db, 'jobs'),
      where('jobType', '==', job.jobType),
      where('cropYear', '==', job.cropYear)
    );

    const snap = await getDocs(q);
    const ids = new Set();

    snap.forEach(doc => {
      const jobData = doc.data();
      jobData.products?.forEach(p => {
        if (p.productId) ids.add(p.productId);
      });
    });

    setUsedProductIds(Array.from(ids));
  };

  loadUsedProducts();
}, [job?.jobType, job?.cropYear]);


 useEffect(() => {
  const fetchData = async () => {
    const jobSnap = await getDoc(doc(db, 'jobsByField', jobId));
    if (jobSnap.exists()) {
      const jobData = { id: jobSnap.id, ...jobSnap.data() };
      setJob({
  ...jobData,
  jobType: jobData.jobType || '',
  drawnPolygon: typeof jobData.drawnPolygon === 'string'
    ? JSON.parse(jobData.drawnPolygon)
    : jobData.drawnPolygon,
});

      setOriginalJob(jobData); // 👈 Save a copy of the original job for comparison

      // 👇 Fetch the full field boundary based on fieldId
      const fieldSnap = await getDoc(doc(db, 'fields', jobData.fieldId));
      if (fieldSnap.exists()) {
  const fieldData = { id: fieldSnap.id, ...fieldSnap.data() };
  setField(fieldData);

  // 🛠️ Parse geojson safely
  let geo = fieldData.boundary?.geojson || null;
  if (typeof geo === 'string') {
    try {
      geo = JSON.parse(geo);
    } catch {
      geo = null;
    }
  }
  setFieldBoundary(geo);
}

    }

    const productsSnap = await getDocs(collection(db, 'products'));
    setProductsList(productsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  fetchData();
}, [jobId]);

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




  const handleProductChange = (index, field, value) => {
    const updated = [...job.products];
    updated[index][field] = value;
    setJob(prev => ({ ...prev, products: updated }));
  };

  const handleSave = async () => {
    setSaving(true);
    const shouldBreakFromGroup = (
  originalJob.vendor !== job.vendor ||
  originalJob.applicator !== job.applicator ||
  originalJob.jobDate !== job.jobDate ||
  JSON.stringify(originalJob.products) !== JSON.stringify(job.products)
);
if (!shouldBreakFromGroup) {
  const cleanedDrawnPolygon = typeof job.drawnPolygon === 'object'
    ? JSON.stringify(job.drawnPolygon)
    : job.drawnPolygon;

  await updateDoc(doc(db, 'jobsByField', job.id), {
    ...job,
    drawnPolygon: cleanedDrawnPolygon
  });

  // 👇 Keep master group job in sync
  if (job.linkedToJobId) {
    const groupRef = doc(db, 'jobs', job.linkedToJobId);
    const groupSnap = await getDoc(groupRef);
    if (groupSnap.exists()) {
      const groupData = groupSnap.data();

      const updatedFields = (groupData.fields || []).map(f => {
        if (f.id !== job.fieldId) return f;

        return {
          ...f,
          drawnPolygon: cleanedDrawnPolygon,
          drawnAcres: job.drawnAcres || f.drawnAcres,
          acres: job.acres || f.acres
        };
      });

      await setDoc(groupRef, {
  ...groupData,
  fields: updatedFields.map(f => ({
    ...f,
    drawnPolygon: f.drawnPolygon ?? null,
    drawnAcres: f.drawnAcres ?? null,
    acres: f.acres ?? 0,
    crop: f.crop ?? '',
    fieldName: f.fieldName ?? '',
  }))
});

    }
  }
if (generatePdf) {
  try {
    const { generatePDFBlob } = await import('../utils/generatePDF');
const fieldSnap = await getDoc(doc(db, 'fields', job.fieldId));
const fieldData = fieldSnap.exists() ? fieldSnap.data() : {};

const fullJob = {
  ...job,
  fields: [
    {
      id: job.fieldId,
      fieldName: job.fieldName,
      acres: job.acres,
      drawnAcres: job.drawnAcres,
      drawnPolygon: job.drawnPolygon,
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
  return;
}

const handleSave = async () => {
  setSaving(true);

  const shouldBreakFromGroup = (
    originalJob.vendor !== job.vendor ||
    originalJob.applicator !== job.applicator ||
    originalJob.jobDate !== job.jobDate ||
    JSON.stringify(originalJob.products) !== JSON.stringify(job.products)
  );

  if (!shouldBreakFromGroup) {
    await updateDoc(doc(db, 'jobsByField', job.id), {
      ...job
    });
    navigate('/jobs');
    return;
  }

  // 🔁 (Then paste the breakaway logic here)
};

    try {
      await updateDoc(doc(db, 'jobsByField', job.id), {
  products: job.products,
  status: job.status || 'Planned',
  vendor: job.vendor || '',
  applicator: job.applicator || '',
  jobDate: job.jobDate || '',
  linkedToJobId: job.linkedToJobId || null

});



      navigate('/jobs');
    } catch (err) {
      console.error('Error updating field job:', err);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  function renderBoundarySVG(geometry, overlayRaw) {
  if (!geometry) return null;

  let shape = geometry;
  if (geometry.type === 'Feature' && geometry.geometry?.type === 'Polygon') {
    shape = geometry.geometry;
  }

  if (shape.type !== 'Polygon' || !shape.coordinates?.[0]) return null;
  const coords = shape.coordinates[0];

  // 🔧 Unwrap overlay if needed
  let overlay = overlayRaw;
  if (overlayRaw?.type === 'Feature' && overlayRaw.geometry?.type === 'Polygon') {
    overlay = overlayRaw.geometry;
  }

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
  if (overlay?.type === 'Polygon' && overlay.coordinates?.[0]) {
    overlayPath = overlay.coordinates[0].map((pt, i) => {
      const { x, y } = project(pt);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ') + ' Z';
  }

  return (
    <svg viewBox={`0 0 ${boxSize} ${boxSize}`} className="w-64 h-64 bg-white border rounded shadow mx-auto">
      <path d={basePath} fill={overlayPath ? '#F87171' : '#34D399'} fillOpacity={0.4} stroke="#4B5563" strokeWidth="1.5" />
      {overlayPath && (
        <path d={overlayPath} fill="#34D399" fillOpacity={0.6} stroke="#047857" strokeWidth="2" />
      )}
    </svg>
  );
}



  if (!job) return <div className="p-6">Loading...</div>;

 return (
  <div className="px-4 py-6 max-w-full overflow-x-hidden">

     <h2 className="text-xl font-bold mb-4">Edit Field Job – {job.fieldName}</h2>
<div className="mb-4">
  <label className="block text-sm font-medium">Job Type</label>
  <select
    value={job.jobType}
    onChange={(e) => setJob(prev => ({ ...prev, jobType: e.target.value }))}
    className="border border-gray-300 rounded-md px-3 py-2 bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="">Select Job Type</option>
    <option value="Seeding">Seeding</option>
    <option value="Spraying">Spraying</option>
    <option value="Fertilizing">Fertilizing</option>
    <option value="Tillage">Tillage</option>
    <option value="Air Drill">Air Drill</option>
    <option value="Broadcast">Broadcast</option>
  </select>
</div>

<div className="mb-4 flex gap-4">
  <div>
    <label className="block text-sm font-medium text-gray-700">Vendor</label>
    <select
      className="border p-2 rounded"
      value={job.vendor || ''}
      onChange={e => setJob(prev => ({ ...prev, vendor: e.target.value }))}
    >
      <option value="">Select Vendor</option>
      {vendors.map(v => (
        <option key={v} value={v}>{v}</option>
      ))}
    </select>
  </div>
<div className="mb-4 flex gap-4">
  {/* Vendor dropdown */}
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

<p className="mb-2 text-sm text-gray-500">{job.jobType} • {job.cropYear} • {job.acres} acres</p>


<div className="mb-6">
  <div className="grid grid-cols-3 font-semibold border-b pb-1 mb-1">
    <span>Product</span>
    <span>Rate</span>
    <span>Units</span>
  </div>

        {job.products.map((p, i) => (
<div
  key={i}
  className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2"
>
          <select
  className="border p-2 rounded"
  value={p.productName || ''}
 onChange={(e) => {
  const productName = e.target.value;
  const matched = productsList.find(prod => prod.name === productName);

  handleProductChange(i, 'productName', productName);

  if (matched) {
    const rateType = matched?.rateType?.toLowerCase();
    const cleanUnit =
      rateType === 'weight'
        ? 'lbs/acre'
        : rateType === 'population'
        ? 'seeds/acre'
        : matched.unit || '';

    handleProductChange(i, 'unit', cleanUnit);
    handleProductChange(i, 'rateType', matched.rateType || '');
    handleProductChange(i, 'productId', matched.id);
    handleProductChange(i, 'crop', matched.crop || '');
  }
}}

>
  <option value="">Select Product</option>
  {productsList.map(prod => (
  <option key={prod.id} value={prod.name}>
    {prod.name}
  </option>
))}
</select>  {/* 👈 properly close the dropdown here */}


           <input
  type="text"
  className="border p-1 rounded"
  value={p.rate}
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
    "seeds/acre"
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
      onChange={(e) => handleProductChange(i, 'unit', e.target.value)}
    >
      <option value="">Select Unit</option>
      {unitOptions.map(unit => (
        <option key={unit} value={unit}>
          {unit}
        </option>
      ))}
    </select>
  );
})()}

          </div>
          
        ))}

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

<div className="border border-gray-300 rounded-xl bg-white p-4 shadow-sm mb-6">

  <label className="block text-sm font-medium text-gray-700 mb-1">Field Map Preview</label>

  {field && (
    <>
      <div>
        <p className="font-semibold mb-1">
          {job.fieldName} – {job.acres?.toFixed?.(2)} acres – {job.drawnPolygon ? 'partial' : 'full'}
        </p>
        <p className="text-sm text-gray-600 mb-2">
          Crop: {job.crop || '—'}
        </p>
      </div>

      <div
        id={`field-canvas-${field.id}`}
        className="bg-white p-2 rounded border shadow-sm"
        style={{ width: 'fit-content', margin: '0 auto' }}
      >
        {(() => {
          console.log("👁️ Field Boundary:", fieldBoundary);
          console.log("👁️ Drawn Polygon:", job.drawnPolygon);

          return renderBoundarySVG(
            fieldBoundary,
            job.drawnPolygon
          );
        })()}
      </div>
    </>
  )}
</div>



<div className="mt-2 no-print">
  <button
    className="text-sm text-blue-600 underline"
    onClick={() =>
      navigate(`/jobs/edit-area/${job.fieldId}`, {
        state: {
          field: {
            id: job.fieldId,
            fieldName: job.fieldName,
            boundary: fieldBoundary
          },
          cropYear: job.cropYear,
          drawnPolygon: job.drawnPolygon,
          drawnAcres: job.drawnAcres
        }
      })
    }
  >
    ✏️ Edit Area
  </button>
</div>

     </div>

<div className="mt-6 border-t pt-4">
  <h4 className="font-semibold text-sm mb-2">Product Totals</h4>
  {job.products.map((p, i) => {
  const rate = parseFloat(p.rate);
  const unit = p.unit?.toLowerCase() || '';
  const crop = p.crop?.toLowerCase?.() || '';
  const acres = job.acres || 0;
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
</div>
);
}

export default FieldJobSummaryPage;

