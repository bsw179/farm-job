// FieldJobSummaryPage.jsx — allows editing of a single jobsByField job without touching the master job
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

function FieldJobSummaryPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [productsList, setProductsList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [applicators, setApplicators] = useState([]);
  const [generatePdf, setGeneratePdf] = useState(false);

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
    const fetchData = async () => {
      const jobSnap = await getDoc(doc(db, 'jobsByField', jobId));
      if (jobSnap.exists()) {
        setJob({ id: jobSnap.id, ...jobSnap.data() });
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
    try {
      await updateDoc(doc(db, 'jobsByField', job.id), {
  products: job.products,
  status: job.status || 'Planned',
  vendor: job.vendor || '',
  applicator: job.applicator || '',
  jobDate: job.jobDate || '',
  linkedToJobId: null
});



      navigate('/jobs');
    } catch (err) {
      console.error('Error updating field job:', err);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (!job) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
     <h2 className="text-xl font-bold mb-4">Edit Field Job – {job.fieldName}</h2>

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
{job.imageBase64 && (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">Field Map Preview</label>
    <img
      src={job.imageBase64}
      alt="Map Preview"
      className="border rounded shadow max-w-xs"
    />
  </div>
)}
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
      handleProductChange(i, 'unit', matched.unit);
    }
  }}
>
  <option value="">Select Product</option>
  {productsList.map(prod => (
    <option key={prod.id} value={prod.name}>
      {prod.name}
    </option>
  ))}
</select>

            <input type="text" className="border p-1 rounded" value={p.rate} onChange={e => handleProductChange(i, 'rate', e.target.value)} />
            <select className="border p-2 rounded" value={p.unit} onChange={e => handleProductChange(i, 'unit', e.target.value)}>
              <option value="">Select Unit</option>
              <option value="oz/acre">oz/acre</option>
              <option value="pt/acre">pt/acre</option>
              <option value="qt/acre">qt/acre</option>
              <option value="gal/acre">gal/acre</option>
              <option value="lbs/acre">lbs/acre</option>
              <option value="seeds/acre">seeds/acre</option>
              <option value="units/acre">units/acre</option>
            </select>
          </div>
        ))}

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
