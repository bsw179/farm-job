import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useCropYear } from '../context/CropYearContext';

export default function InputsPage() {
  const { cropYear } = useCropYear(); // 🔁 Your crop year selector hook
  const [jobs, setJobs] = useState([]);
  const [products, setProducts] = useState({});
  const [fields, setFields] = useState({});
  const [appliedMap, setAppliedMap] = useState({});
  const [purchases, setPurchases] = useState([]);
  const [purchasedMap, setPurchasedMap] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const [jobSnap, productSnap, fieldSnap] = await Promise.all([
        getDocs(collection(db, 'jobs')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'fields')),
      ]);
const purchaseSnap = await getDocs(collection(db, 'inputPurchases'));
const allPurchases = purchaseSnap.docs
  .map(doc => ({ id: doc.id, ...doc.data() }))
  .filter(p => p.cropYear === cropYear);

const totals = {};

allPurchases.forEach(p => {
  if (!p.productId || !p.amount) return;
  totals[p.productId] = (totals[p.productId] || 0) + parseFloat(p.amount);
});

setPurchases(allPurchases);
setPurchasedMap(totals);
      const jobList = jobSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(job => job.cropYear === cropYear);

      const productMap = {};
      productSnap.docs.forEach(doc => {
        productMap[doc.id] = doc.data();
      });

      const fieldMap = {};
      fieldSnap.docs.forEach(doc => {
        fieldMap[doc.id] = doc.data();
      });

      const appliedTotals = {};

      jobList.forEach(job => {
        const jobProducts = job.products || [];
        const jobFields = job.fields || [];

        jobProducts.forEach(product => {
          const prodData = productMap[product.productId];
          if (!prodData) return;

          jobFields.forEach(field => {
            const fieldData = fieldMap[field.id];
            if (!fieldData) return;

            let acres = 0;
            const crop = fieldData.crops?.[cropYear]?.crop || fieldData.crop || '';
            const name = job.jobType?.name?.toLowerCase?.() || '';

            if (name.includes('levee') || name.includes('pack')) {
              if (crop.includes('Rice')) acres = parseFloat(fieldData.riceLeveeAcres) || 0;
              else if (crop.includes('Soybean')) acres = parseFloat(fieldData.beanLeveeAcres) || 0;
            } else {
              acres = job.acres?.[field.id] || fieldData.gpsAcres || 0;
            }

            const key = product.productId;
            const rate = parseFloat(product.rate) || 0;
            const total = rate * acres;

            appliedTotals[key] = (appliedTotals[key] || 0) + total;
          });
        });
      });

      setJobs(jobList);
      setProducts(productMap);
      setFields(fieldMap);
      setAppliedMap(appliedTotals);
    };

    fetchData();
  }, [cropYear]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">🧪 Inputs Tracker - {cropYear}</h1>

      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1 text-left">Product</th>
            <th className="border px-2 py-1 text-left">Type</th>
            <th className="border px-2 py-1 text-center">Log Purchase</th>
            <th className="border px-2 py-1 text-right">Applied</th>
            <th className="border px-2 py-1 text-right">Purchased</th>
            <th className="border px-2 py-1 text-right">Remaining</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(products)
  .filter(([productId]) => appliedMap[productId]) // ← only show used products
  .map(([productId, product]) => {

            const applied = appliedMap[productId] || 0;
            return (
              <tr key={productId}>
                <td className="border px-2 py-1">{product.name}</td>
                <td className="border px-2 py-1">{product.type}</td>
               <td className="border px-2 py-1 text-center">
  <button
    onClick={() => {
      setSelectedProduct({ id: productId, ...product });
      setShowModal(true);
    }}
    className="text-blue-600 hover:underline text-sm"
  >
    Log purchase
  </button>
</td>

                <td className="border px-2 py-1 text-right">
  {(() => {
    const crop = product.crop?.toLowerCase?.() || '';
    const raw = applied;

    // Rice/beans planted by weight
    if (crop.includes('rice')) {
      const bushels = raw / 45;
      return `${bushels.toLocaleString(undefined, { maximumFractionDigits: 0 })} bushels (45 lbs/bu)`;
    }

    if (crop.includes('soybean')) {
      const bushels = raw / 60;
      return `${bushels.toLocaleString(undefined, { maximumFractionDigits: 0 })} bushels (60 lbs/bu)`;
    }

    // Fallback
    return `${raw.toLocaleString()} ${product.unit || ''}`;
  })()}
</td>

<td className="border px-2 py-1 text-right">
  {purchasedMap[productId]
    ? purchasedMap[productId].toLocaleString(undefined, { maximumFractionDigits: 0 })
    : '—'}
</td>
<td className="border px-2 py-1 text-right">
  {(() => {
    const crop = product.crop?.toLowerCase?.() || '';
    const type = product.type?.toLowerCase?.() || '';
    const applied = appliedMap[productId] || 0;

    // Get all purchases for this product
    const matchingPurchases = purchases.filter(p => p.productId === productId);
    let totalPurchased = 0;

    for (const p of matchingPurchases) {
  let amount = parseFloat(p.amount) || 0;
const unit = (p.unit || '').toLowerCase();
if (type === 'seed') {
  if (unit === 'bushel' || unit === 'bushels') {
    if (crop.includes('rice')) amount *= 45;
    else if (crop.includes('soybean')) amount *= 60;
  } else if (unit === 'unit' || unit === 'units') {
    if (crop.includes('rice')) amount *= 900000;
    else if (crop.includes('soybean')) amount *= 140000;
  }
}

if (type === 'fertilizer') {
  if (unit === 'ton' || unit === 'tons') amount *= 2000;
}

if (type === 'chemical') {
  if (unit === 'gal' || unit === 'gallon' || unit === 'gallons') amount *= 128;
}


console.log('🔎 Purchase', {
  product: p.productId,
  unit: p.unit,
  rawAmount: p.amount,
  normalizedAmount: amount,
});


      if (type === 'seed') {
        if (unit.includes('bushel')) {
          if (crop.includes('rice')) amount *= 45;
          else if (crop.includes('soybean')) amount *= 60;
        } else if (unit.includes('unit')) {
          if (crop.includes('rice')) amount *= 900000;
          else if (crop.includes('soybean')) amount *= 140000;
        }
      }

      if (type === 'fertilizer') {
        if (unit.includes('ton')) amount *= 2000;
      }

      if (type === 'chemical') {
        if (unit.includes('gal')) amount *= 128;
      }

      totalPurchased += amount;
    }

    const remaining = totalPurchased - applied;
    return matchingPurchases.length
      ? remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : '—';
  })()}
</td>




              </tr>
            );
          })}
        </tbody>
      </table>

      {showModal && selectedProduct && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded shadow-xl w-[400px] space-y-4 relative">
      <button
        onClick={() => setShowModal(false)}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-sm"
      >
        ✕
      </button>
      <h2 className="text-lg font-bold">Log Purchase – {selectedProduct.name}</h2>
      <form
      onSubmit={async (e) => {
  e.preventDefault();
  const form = e.target;
  const amount = parseFloat(form.amount.value);
  const unit = form.unit.value;
  const cost = parseFloat(form.cost.value);
  const vendor = form.vendor.value;
  const date = form.date.value;

  if (!amount || !unit || !date) {
    alert('Amount, unit, and date are required');
    return;
  }

  await addDoc(collection(db, 'inputPurchases'), {
    cropYear,
    productId: selectedProduct.id,
    amount,
    unit,
    cost,
    vendor,
    date: new Date(date),
  });

  setShowModal(false);
  window.location.reload();
}}

        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium">Amount</label>
          <input name="amount" type="number" step="any" className="border w-full px-2 py-1 rounded" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Unit</label>
          <input name="unit" type="text" className="border w-full px-2 py-1 rounded" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Total Cost</label>
          <input name="cost" type="number" step="any" className="border w-full px-2 py-1 rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium">Vendor</label>
          <input name="vendor" type="text" className="border w-full px-2 py-1 rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium">Date</label>
          <input name="date" type="date" className="border w-full px-2 py-1 rounded" required />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
        >
          Save Purchase
        </button>
      </form>
    </div>
  </div>
)}

    </div>
    
  );
}
