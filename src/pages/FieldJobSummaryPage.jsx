// FieldJobSummaryPage.jsx — allows editing of a single jobsByField job without touching the master job
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

function FieldJobSummaryPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

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
    if (!jobType) return;

    const q = query(
      collection(db, 'jobs'),
      where('jobType', '==', jobType),
      where('cropYear', '==', cropYear) // optional, can remove if you want across all years
    );

    const snap = await getDocs(q);
    const ids = new Set();

    snap.forEach(doc => {
      const job = doc.data();
      job.products?.forEach(p => {
        if (p.productId) ids.add(p.productId);
      });
    });

    setUsedProductIds(Array.from(ids));
  };

  loadUsedProducts();
}, [jobType, cropYear]);

 useEffect(() => {
  const fetchData = async () => {
    const jobSnap = await getDoc(doc(db, 'jobsByField', jobId));
    if (jobSnap.exists()) {
      const jobData = { id: jobSnap.id, ...jobSnap.data() };
      setJob(jobData);
      setOriginalJob(jobData); // 👈 Save a copy of the original job for comparison

      // 👇 Fetch the full field boundary based on fieldId
      const fieldSnap = await getDoc(doc(db, 'fields', jobData.fieldId));
      if (fieldSnap.exists()) {
        const fieldData = fieldSnap.data();
        setFieldBoundary(fieldData.boundary?.geojson || null);
      }
    }

    const productsSnap = await getDocs(collection(db, 'products'));
    setProductsList(productsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  fetchData();
}, [jobId]);



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
  await updateDoc(doc(db, 'jobsByField', job.id), {
  ...job
});

// 👇 Add this immediately after
if (job.linkedToJobId) {
  const groupRef = doc(db, 'jobs', job.linkedToJobId);
  const groupSnap = await getDoc(groupRef);
  if (groupSnap.exists()) {
    const groupData = groupSnap.data();

    const updatedFields = (groupData.fields || []).map(f => {
      if (f.id !== job.fieldId) return f;

      return {
        ...f,
        drawnPolygon: job.drawnPolygon || f.drawnPolygon,
        drawnAcres: job.drawnAcres || f.drawnAcres,
        acres: job.acres || f.acres
      };
    });

    await setDoc(groupRef, {
      ...groupData,
      fields: updatedFields
    });
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
    <div className="p-6">
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
          <div key={i} className="grid grid-cols-3 gap-2 mb-2">
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
  <button
  onClick={() =>
    setJob(prev => ({
      ...prev,
      products: [...prev.products, { productId: '', productName: '', rate: '', unit: '' }]
    }))
  }
  className="text-blue-600 hover:text-blue-800 underline text-sm mb-4"
>
  + Add Product
</button>

</select>

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
<div className="mb-6">
  <label className="block text-sm font-medium text-gray-700 mb-1">Field Map Preview</label>
  <div
    id={`field-canvas-${field.id}`}
    className="bg-white p-2 rounded border shadow-sm"
    style={{ width: 'fit-content', margin: '0 auto' }}
  >
    {renderBoundarySVG(
      typeof fieldBoundary === 'string' ? JSON.parse(fieldBoundary) : fieldBoundary,
      job.drawnPolygon
    )}
  </div>
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
