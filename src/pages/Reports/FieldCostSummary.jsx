import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useMemo } from 'react';

export default function FieldCostSummary() {
  const [jobsByField, setJobsByField] = useState([]);
  const [inputPurchases, setInputPurchases] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);

  // Fetch jobsByField
 useEffect(() => {
  const fetchData = async () => {
    const jobsSnap = await getDocs(collection(db, 'jobsByField'));
    const purchasesSnap = await getDocs(collection(db, 'inputPurchases'));
    const jobTypesSnap = await getDocs(collection(db, 'jobTypes'));
    const productsSnap = await getDocs(collection(db, 'products'));

    const jobs = jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const purchases = purchasesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const jobTypes = jobTypesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    setJobsByField(jobs);
    setInputPurchases(purchases);
    setJobTypes(jobTypes);
    setProducts(products);
    setLoading(false);
  };

  fetchData();
}, []);

  function getAvgNormalizedUnitCost(productId, inputPurchases) {
  const matches = inputPurchases.filter(p => p.productId === productId);
  const totalCost = matches.reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0);
  const totalNorm = matches.reduce((sum, p) => {
    const amount = parseFloat(p.amount || 0);
    const unitSize = parseFloat(p.unitSize || 1);
    return sum + (amount * unitSize);
  }, 0);
  return totalNorm > 0 ? totalCost / totalNorm : 0;
}

const costsByField = useMemo(() => {
  const grouped = {};

  // --- Index master products for fallback ---
  const productMap = {};
  products.forEach(p => {
    productMap[p.id] = p;
  });

  // --- Helper: get normalized $/unit from purchases ---
  function getAvgNormalizedUnitCost(productId) {
    const matches = inputPurchases.filter(p => p.productId === productId);
    const totalCost = matches.reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0);
    const totalNorm = matches.reduce((sum, p) => {
      const amount = parseFloat(p.amount || 0);
      const unitSize = parseFloat(p.unitSize || 1);
      return sum + (amount * unitSize);
    }, 0);
    return totalNorm > 0 ? totalCost / totalNorm : 0;
  }

  // --- Group jobs by field and calculate cost ---
  jobsByField.forEach(job => {
    const { fieldId, fieldName, crop, acres, riceLeveeAcres, beanLeveeAcres, jobType, waterVolume } = job;
    const actualAcres = jobType?.name?.includes('Levee')
      ? riceLeveeAcres || beanLeveeAcres || acres
      : acres;

    if (!fieldId || !actualAcres) return;

    if (!grouped[fieldId]) {
      grouped[fieldId] = {
        fieldName,
        crop,
        totalAcres: 0,
        seedCost: 0,
        fertCost: 0,
        chemCost: 0,
        jobTypeCost: 0
      };
    }

    grouped[fieldId].totalAcres += actualAcres;

    // --- Loop through job products ---
    (job.products || []).forEach(prod => {
      const { productId, rate, unit } = prod;
      if (!productId || !rate) return;

      const product = productMap[productId] || {};
      const type = prod.type || product.type || '';

      // --- Normalize rate-based usage ---
      let applied = 0;
      const parsedRate = parseFloat(rate || 0);
      const rawUnit = (unit || '').toLowerCase();

      if (rawUnit === '%v/v') {
        const gal = parseFloat(waterVolume || 0);
        if (gal > 0) {
          applied = parsedRate * gal * 128; // fl oz
        }
      } else {
        applied = parsedRate * actualAcres;
      }

      const unitCost = getAvgNormalizedUnitCost(productId);
      const cost = applied * unitCost;

      // --- Allocate cost by type ---
      if (type === 'Seed' || type === 'Seed Treatment') {
        grouped[fieldId].seedCost += cost;
      } else if (type === 'Fertilizer') {
        grouped[fieldId].fertCost += cost;
      } else if (type === 'Chemical') {
        grouped[fieldId].chemCost += cost;
      }
    });

    // --- Add jobType cost if available ---
    if (jobType?.id) {
      const jobTypeDoc = jobTypes.find(jt => jt.id === jobType.id);
      const typeCost = jobTypeDoc?.cost ?? 0;
      grouped[fieldId].jobTypeCost += typeCost * actualAcres;
    }
  });

  // --- Final per-acre totals ---
  Object.values(grouped).forEach(field => {
    field.totalCost = field.seedCost + field.fertCost + field.chemCost + field.jobTypeCost;
  });

  return grouped;
}, [jobsByField, inputPurchases, jobTypes, products]);



  if (loading) return <div className="p-6">Loading Field Cost Summary...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Field Cost Summary</h2>
      <p className="text-gray-600 mb-6">
        Breakdown of seed, fertilizer, chemical, and job type costs per acre by field.
      </p>

      {/* Table placeholder for when reducer logic is ready */}
      <div className="border rounded p-4 bg-gray-50 text-gray-500 italic">
<table className="min-w-full border text-sm">
  <thead className="bg-gray-100">
    <tr>
      <th className="border p-2 text-left">Field</th>
      <th className="border p-2 text-left">Crop</th>
      <th className="border p-2 text-right">Seed ($/ac)</th>
      <th className="border p-2 text-right">Fertilizer ($/ac)</th>
      <th className="border p-2 text-right">Chem ($/ac)</th>
      <th className="border p-2 text-right">Job Type ($/ac)</th>
      <th className="border p-2 text-right font-bold">Total ($/ac)</th>
    </tr>
  </thead>
  <tbody>
    {Object.values(costsByField).map((field, i) => (
      <tr key={i}>
        <td className="border p-2">{field.fieldName}</td>
        <td className="border p-2">{field.crop}</td>
        <td className="border p-2 text-right">${(field.seedCost / field.totalAcres).toFixed(2)}</td>
        <td className="border p-2 text-right">${(field.fertCost / field.totalAcres).toFixed(2)}</td>
        <td className="border p-2 text-right">${(field.chemCost / field.totalAcres).toFixed(2)}</td>
        <td className="border p-2 text-right">${(field.jobTypeCost / field.totalAcres).toFixed(2)}</td>
        <td className="border p-2 text-right font-bold">${(field.totalCost / field.totalAcres).toFixed(2)}</td>
      </tr>
    ))}
  </tbody>
</table>
      </div>
    </div>
  );
}
