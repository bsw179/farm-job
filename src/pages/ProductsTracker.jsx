// src/pages/ProductsTracker.jsx
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useCropYear } from '../context/CropYearContext';
import { useNavigate } from 'react-router-dom';
import ProductSummaryModal from '../components/ProductSummaryModal';

export default function ProductsTracker() {
  const { cropYear } = useCropYear();
  const navigate = useNavigate();
  const [products, setProducts] = useState({});
  const [purchases, setPurchases] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobsByField, setJobsByField] = useState([]);

  const [fields, setFields] = useState({});
  const [selectedProductId, setSelectedProductId] = useState(null);
// 🔹 Display unit label
const getDisplayUnitLabel = (product) => {
  const type = (product.type || '').toLowerCase();
  const crop = (product.crop || '').toLowerCase();

  if (type === 'seed') {
    if (product.unit?.includes('seed')) return 'seeds';
    if (product.unit?.includes('unit')) return 'units';
    if (product.unit?.includes('lb')) return 'lbs';
    return crop.includes('rice') || crop.includes('soy') ? 'lbs' : 'units';
  }

  if (type === 'fertilizer') return 'lbs';
  if (type === 'chemical') return 'oz';
  return 'units';
};

// 🔹 Convert normalized to invoice-style unit
const getInvoiceEquivalent = (product, normalized) => {
  const type = (product.type || '').toLowerCase();
  const crop = (product.crop || '').toLowerCase();

  if (type === 'seed') {
    if (normalized > 5000000) {
      if (crop.includes('rice')) return `${(normalized / 900000).toFixed(1)} units`;
      if (crop.includes('soybean')) return `${(normalized / 140000).toFixed(1)} units`;
    } else {
      if (crop.includes('rice')) return `${(normalized / 45).toFixed(1)} bushels`;
      if (crop.includes('soybean')) return `${(normalized / 60).toFixed(1)} bushels`;
    }
  }

  if (type === 'fertilizer') return `${(normalized / 2000).toFixed(1)} tons`;
  if (type === 'chemical') return `${(normalized / 128).toFixed(1)} gal`;

  return '';
};

  useEffect(() => {
    const fetchData = async () => {
   const [productSnap, purchaseSnap, jobSnap, fieldSnap, jobByFieldSnap] = await Promise.all([
  getDocs(collection(db, 'products')),
  getDocs(collection(db, 'inputPurchases')),
  getDocs(collection(db, 'jobs')),
  getDocs(collection(db, 'fields')),
  getDocs(collection(db, 'jobsByField')), // ✅ add this
]);


      const productMap = {};
      productSnap.docs.forEach(doc => productMap[doc.id] = doc.data());

      const filteredPurchases = purchaseSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => p.cropYear === cropYear);

      const jobList = jobSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(j => j.cropYear === cropYear && j.status !== 'Planned');
const jobsByFieldList = jobByFieldSnap.docs.map(doc => ({
  id: doc.id,
  ...doc.data(),
}));
setJobsByField(jobsByFieldList);

      const fieldMap = {};
      fieldSnap.docs.forEach(doc => fieldMap[doc.id] = doc.data());

      setProducts(productMap);
      setPurchases(filteredPurchases);
      setJobs(jobList);
      setFields(fieldMap);
    };

    fetchData();
  }, [cropYear]);

  const getAppliedTotals = () => {
  const applied = {};

  jobsByField.forEach(job => {
    const jobProducts = job.products || [];
    const fieldData = fields[job.fieldId];
    if (!fieldData) return;

    const crop = (fieldData.crops?.[cropYear]?.crop || fieldData.crop || '').toLowerCase();
    const jobName = (job.jobType?.name || '').toLowerCase();

    const acres = (() => {
      if (jobName.includes('levee') || jobName.includes('pack')) {
        if (crop.includes('rice')) return parseFloat(fieldData.riceLeveeAcres) || 0;
        if (crop.includes('soybean')) return parseFloat(fieldData.beanLeveeAcres) || 0;
        return 0;
      }
      return job.acres || fieldData.gpsAcres || 0;
    })();

    jobProducts.forEach(product => {
      const productId = product.productId;
      if (!productId) return;

      const rate = parseFloat(product.rate) || 0;
      const total = rate * acres;

      applied[productId] = (applied[productId] || 0) + total;
    });
  });

  return applied;
};


  const appliedMap = getAppliedTotals();

 // 🔹 Build a Set of productIds that were used in jobs
const usedProductIds = new Set();
jobsByField.forEach(j => {
  (j.products || []).forEach(p => {
    if (p.productId) usedProductIds.add(p.productId);
  });
});


// 🔹 Filter only products that were used OR purchased
const totals = Object.entries(products)
  .map(([id, product]) => {
    const purchasesForProduct = purchases.filter(p => p.productId === id);
    const purchased = purchasesForProduct.reduce((sum, p) => sum + (p.normalizedAmount || 0), 0);
    const applied = appliedMap[id] || 0;
    const remaining = purchased - applied;
    const totalCost = purchasesForProduct.reduce((sum, p) => sum + (p.cost || 0), 0);
    // 🔹 Calculate avg $/unit based on purchase unit (not normalized)
let avgRate = null;

if (purchasesForProduct.length > 0) {
  const unitGrouped = {};

  purchasesForProduct.forEach(p => {
    if (!unitGrouped[p.unit]) {
      unitGrouped[p.unit] = { totalAmount: 0, totalCost: 0 };
    }
    unitGrouped[p.unit].totalAmount += p.amount || 0;
    unitGrouped[p.unit].totalCost += p.cost || 0;
  });

  const [firstUnit, unitData] = Object.entries(unitGrouped)[0] || [];
  avgRate = unitData.totalAmount > 0
    ? {
        value: unitData.totalCost / unitData.totalAmount,
        unit: firstUnit
      }
    : null;
}


    return {
      id,
      name: product.name,
      type: product.type,
      purchased,
      applied,
      remaining,
      avgRate,
      totalCost,
    };
  })
  .filter(row => usedProductIds.has(row.id) || row.purchased > 0);



  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📦 Product Tracker – {cropYear}</h1>
        <button onClick={() => navigate('/financial/log')} className="bg-blue-600 text-white px-4 py-2 rounded">Log Purchase</button>
      </div>

      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1 text-left">Product</th>
            <th className="border px-2 py-1 text-left">Type</th>
            <th className="border px-2 py-1 text-right">Applied</th>
            <th className="border px-2 py-1 text-right">Purchased</th>
            <th className="border px-2 py-1 text-right">Remaining</th>
            <th className="border px-2 py-1 text-right">Avg $/unit</th>
            <th className="border px-2 py-1 text-right">Total Cost</th>
          </tr>
        </thead>
        <tbody>
          {totals.map(row => (
            <tr key={row.id} className="hover:bg-gray-50 cursor-pointer">
              <td
  className="border px-2 py-1 text-blue-600 hover:underline cursor-pointer"
  onClick={() => setSelectedProductId(row.id)}
>
  {row.name}
</td>

              <td className="border px-2 py-1">{row.type}</td>
<td className="border px-2 py-1 text-right">
  {row.applied.toLocaleString()} {getDisplayUnitLabel(products[row.id])}
  <span className="text-gray-500 ml-1 text-xs">({getInvoiceEquivalent(products[row.id], row.applied)})</span>
</td>
              <td className="border px-2 py-1 text-right">{row.purchased.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
<td className="border px-2 py-1 text-right">
  {row.remaining.toLocaleString()} {getDisplayUnitLabel(products[row.id])}
  <span className="text-gray-500 ml-1 text-xs">({getInvoiceEquivalent(products[row.id], row.remaining)})</span>
</td>
<td className="border px-2 py-1 text-right">
  {row.avgRate ? `$${row.avgRate.value.toFixed(2)} / ${row.avgRate.unit}` : '—'}
</td>
              <td className="border px-2 py-1 text-right">{row.totalCost ? `$${row.totalCost.toFixed(2)}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {selectedProductId && (
<ProductSummaryModal
  product={{ id: selectedProductId, ...products[selectedProductId] }}
  purchases={purchases.filter(p => p.productId === selectedProductId)}
  jobsByField={jobsByField.filter(j =>
    j.products?.some(p => p.productId === selectedProductId)
  )}
  fields={fields}
  onClose={() => setSelectedProductId(null)}
/>



)}

    </div>
  );
}
