// src/components/ProductSummaryModal.jsx
import React from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';


export default function ProductSummaryModal({ product, purchases, jobsByField, fields, onClose }) {




    // 🔹 Total raw applied + purchase cost
const totalPurchased = purchases.reduce((sum, p) => sum + (p.normalizedAmount || 0), 0);
const totalCost = purchases.reduce((sum, p) => sum + (p.cost || 0), 0);

// 🔹 Avg $/unit based on original purchase unit (not normalized)
let avgRate = null;

if (purchases.length > 0) {
  const unitGrouped = {};

  purchases.forEach(p => {
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
console.log('🧪 Checking for matches with product.id =', product.id);

const matchedJobs = jobsByField.filter(j =>
  j.products?.some(p => {
    console.log('🔍 comparing', p.productId, '===', product.id);
    return p.productId === product.id;
  })
);



// 🔹 Calculate total applied
let totalApplied = 0;

matchedJobs.forEach(job => {
  const matching = job.products.filter(p => p.productId === product.id);
  const field = fields[job.fieldId];
  if (!field) return;

  const crop = field.crops?.[job.cropYear]?.crop || field.crop || '';
  const jobName = job.jobType?.name?.toLowerCase() || '';
  const acres = (() => {
    if (jobName.includes('levee') || jobName.includes('pack')) {
      if (crop.toLowerCase().includes('rice')) return parseFloat(field.riceLeveeAcres) || 0;
      if (crop.toLowerCase().includes('soybean')) return parseFloat(field.beanLeveeAcres) || 0;
      return 0;
    }
    return job.acres || field.gpsAcres || 0;
  })();

  matching.forEach(p => {
    const rate = parseFloat(p.rate) || 0;
    const total = rate * acres;
    totalApplied += total;
  });
});



  const remaining = totalPurchased - totalApplied;

  const navigate = useNavigate();
  // 🔹 Convert normalized to invoice-style unit (bushels, units)
const getInvoiceEquivalent = (normalized) => {
  const type = (product.type || '').toLowerCase();
  const crop = (product.crop || '').toLowerCase();

  if (type === 'seed') {
    if (normalized > 5000000) {
      // Treat as seeds
      if (crop.includes('rice')) return `${(normalized / 900000).toFixed(1)} units`;
      if (crop.includes('soybean')) return `${(normalized / 140000).toFixed(1)} units`;
    } else {
      // Treat as weight
      if (crop.includes('rice')) return `${(normalized / 45).toFixed(1)} bushels`;
      if (crop.includes('soybean')) return `${(normalized / 60).toFixed(1)} bushels`;
    }
  }

  if (type === 'fertilizer') return `${(normalized / 2000).toFixed(1)} tons`;
  if (type === 'chemical') return `${(normalized / 128).toFixed(1)} gal`;

  return '';
};

// 🔹 Resolve normalized unit label
const getDisplayUnitLabel = () => {
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
const convertRateToPurchaseUnit = (rate, product) => {
  const type = (product.type || '').toLowerCase();
  const crop = (product.crop || '').toLowerCase();
  const unit = (product.unit || '').toLowerCase();

  // 🔹 Chem: applied in oz, purchased in gal
  if (type === 'chemical') {
    if (unit.includes('pint')) return rate / 16;
    if (unit.includes('quart')) return rate / 32;
    if (unit.includes('gal') || unit.includes('gallon')) return rate / 128;
  }

  // 🔹 Fertilizer: applied in lbs, purchased in tons
  if (type === 'fertilizer') {
    if (unit.includes('ton')) return rate / 2000;
  }

  // 🔹 Seed conversions
  if (type === 'seed') {
    // Applied in seeds
    if (unit.includes('seed') || unit.includes('population')) {
      if (crop.includes('rice')) return rate / 900000;
      if (crop.includes('soy')) return rate / 140000;
    }

    // Applied in lbs → convert to bushels
    if (unit.includes('bu')) {
      if (crop.includes('rice')) return rate / 45;
      if (crop.includes('soy')) return rate / 60;
    }
  }

  // Fallback: assume same unit
  return rate;
};


  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-xl w-[700px] max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-sm"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-1">{product.name}</h2>
        <p className="text-sm text-gray-600 mb-4">
          {product.type} • {product.crop} • {product.unit}
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
      <div>
  <strong>Applied:</strong> {totalApplied.toLocaleString()} {getDisplayUnitLabel()}
  <span className="text-gray-500 ml-1 text-sm">({getInvoiceEquivalent(totalApplied)})</span>
</div>



          <div><strong>Purchased:</strong> {totalPurchased.toLocaleString()}</div>
          <div><strong>Remaining:</strong> {remaining.toLocaleString()}</div>
          <div><strong>Avg $/unit:</strong> {avgRate ? `$${avgRate.value.toFixed(2)} / ${avgRate.unit}` : '—'}</div>

          <div><strong>Total Cost:</strong> {totalCost ? `$${totalCost.toFixed(2)}` : '—'}</div>
        </div>

        <h3 className="font-semibold text-sm border-b pb-1 mb-2">Purchase History</h3>
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">Date</th>
              <th className="border px-2 py-1">Vendor</th>
              <th className="border px-2 py-1">Amount</th>
              <th className="border px-2 py-1">Unit</th>
              <th className="border px-2 py-1">Cost</th>
              <th className="border px-2 py-1">Rate</th>
              <th className="border px-2 py-1">Note</th>
            </tr>
          </thead>
          <tbody>
           {purchases.map((p, i) => (
  <tr key={p.id}>
    {/* 🔹 Date */}
    <td className="border px-2 py-1">{p.date?.toDate?.().toLocaleDateString?.() || '—'}</td>

    {/* 🔹 Vendor */}
    <td className="border px-2 py-1">{p.vendor || '—'}</td>

    {/* 🔹 Amount + Unit */}
    <td className="border px-2 py-1 text-right">{p.amount}</td>
    <td className="border px-2 py-1">{p.unit}</td>

    {/* 🔹 Cost + Rate */}
    <td className="border px-2 py-1 text-right">{p.cost ? `$${p.cost.toFixed(2)}` : '—'}</td>
    <td className="border px-2 py-1 text-right">{p.rate ? `$${p.rate.toFixed(2)}` : '—'}</td>

    {/* 🔹 Invoice + Note */}
    <td className="border px-2 py-1">{p.note || '—'}</td>

    {/* 🔹 Delete Button */}
   <td className="border px-2 py-1 text-right whitespace-nowrap">
  <button
    onClick={() => {
      navigate(`/financial/log?id=${p.id}`);
    }}
    className="text-blue-600 hover:underline text-xs mr-2"
  >
    Edit
  </button>
  <button
    onClick={async () => {
      if (window.confirm('Are you sure you want to delete this purchase?')) {
        await deleteDoc(doc(db, 'inputPurchases', p.id));
        window.location.reload();
      }
    }}
    className="text-red-600 hover:underline text-xs"
  >
    Delete
  </button>
</td>

  </tr>
))}

          </tbody>
        </table>
        <h3 className="font-semibold text-sm border-b pb-1 mb-2 mt-6">Usage History</h3>
<table className="w-full text-sm border">
  <thead className="bg-gray-100">
    <tr>
      <th className="border px-2 py-1">Date</th>
      <th className="border px-2 py-1">Field</th>
      <th className="border px-2 py-1">Farm</th>
      <th className="border px-2 py-1">Job</th>
      <th className="border px-2 py-1">Vendor</th>
      <th className="border px-2 py-1 text-right">Acres</th>
      <th className="border px-2 py-1 text-right">Rate</th>
      <th className="border px-2 py-1 text-right">Total</th>
      <th className="border px-2 py-1 text-right">$/acre</th>
    </tr>
  </thead>
  <tbody>
  {matchedJobs.flatMap(job => {
  const field = fields[job.fieldId];
  if (!field) return [];

  const crop = field.crops?.[job.cropYear]?.crop || field.crop || '';
  const jobName = job.jobType?.name?.toLowerCase() || '';
  const acres = (() => {
    if (jobName.includes('levee') || jobName.includes('pack')) {
      if (crop.toLowerCase().includes('rice')) return parseFloat(field.riceLeveeAcres) || 0;
      if (crop.toLowerCase().includes('soybean')) return parseFloat(field.beanLeveeAcres) || 0;
      return 0;
    }
    return job.acres || field.gpsAcres || 0;
  })();

  return job.products
    .filter(p => p.productId === product.id)
    .map(p => {
      const rate = parseFloat(p.rate) || 0;
      const total = rate * acres;

      return (
        <tr key={`${job.id}-${p.productId}`}>
          <td className="border px-2 py-1">
            {job.jobDate ? new Date(job.jobDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
          </td>
          <td className="border px-2 py-1">{field.fieldName || '—'}</td>
          <td className="border px-2 py-1">{field.farmName || '—'}</td>
          <td className="border px-2 py-1">{job.jobType?.name || '—'}</td>
          <td className="border px-2 py-1">{job.vendor || '—'}</td>
          <td className="border px-2 py-1 text-right">{acres.toFixed(1)}</td>
          <td className="border px-2 py-1 text-right">{rate} {p.unit}</td>
          <td className="border px-2 py-1 text-right">{total.toFixed(1)}</td>
          <td className="border px-2 py-1 text-right">
          {avgRate ? `$${(convertRateToPurchaseUnit(rate, product) * avgRate.value).toFixed(2)}` : '—'}
          </td>

        </tr>
      );
    });
})

  .filter(Boolean)}

  </tbody>
</table>
<h3 className="font-semibold text-sm border-b pb-1 mb-2 mt-6">Expense Split Summary</h3>
<table className="w-full text-sm border">
  <thead className="bg-gray-100">
    <tr>
      <th className="border px-2 py-1">Entity</th>
      <th className="border px-2 py-1 text-right">Share</th>
    </tr>
  </thead>
  <tbody>
    {(() => {
      const entityTotals = {};

   matchedJobs.forEach(job => {
  const field = fields[job.fieldId];
  if (!field) return;

  const crop = field.crops?.[job.cropYear]?.crop || field.crop || '';
  const jobName = job.jobType?.name?.toLowerCase() || '';
  const acres = (() => {
    if (jobName.includes('levee') || jobName.includes('pack')) {
      if (crop.toLowerCase().includes('rice')) return parseFloat(field.riceLeveeAcres) || 0;
      if (crop.toLowerCase().includes('soybean')) return parseFloat(field.beanLeveeAcres) || 0;
      return 0;
    }
    return job.acres || field.gpsAcres || 0;
  })();

  job.products
    .filter(p => p.productId === product.id)
    .forEach(p => {
      const rate = parseFloat(p.rate) || 0;
      const total = rate * acres;

      const operator = field.operator || '—';
      const landowner = field.landowner || '—';
      const operatorShare = field.operatorExpenseShare ?? 0;
      const landownerShare = field.landownerExpenseShare ?? 0;

      if (operatorShare > 0) {
        entityTotals[operator] = (entityTotals[operator] || 0) + total * (operatorShare / 100);
      }

      if (landownerShare > 0) {
        entityTotals[landowner] = (entityTotals[landowner] || 0) + total * (landownerShare / 100);
      }
    });
});



      return Object.entries(entityTotals).map(([name, amount]) => (
        <tr key={name}>
          <td className="border px-2 py-1">{name}</td>
          <td className="border px-2 py-1 text-right">{amount.toFixed(1)}</td>
        </tr>
      ));
    })()}
  </tbody>
</table>
{/* 🔹 Reconciliation Note */}
<div className="mt-6 border-t pt-4 text-sm">
  {(() => {
    // 1. Calculate your total share of applied amount
    let totalMyShare = 0;

  matchedJobs.forEach(job => {
  const field = fields[job.fieldId];
  if (!field) return;

  const crop = field.crops?.[job.cropYear]?.crop || field.crop || '';
  const jobName = job.jobType?.name?.toLowerCase() || '';
  const acres = (() => {
    if (jobName.includes('levee') || jobName.includes('pack')) {
      if (crop.toLowerCase().includes('rice')) return parseFloat(field.riceLeveeAcres) || 0;
      if (crop.toLowerCase().includes('soybean')) return parseFloat(field.beanLeveeAcres) || 0;
      return 0;
    }
    return job.acres || field.gpsAcres || 0;
  })();

  job.products
    .filter(p => p.productId === product.id)
    .forEach(p => {
      const rate = parseFloat(p.rate) || 0;
      const total = rate * acres;

      const operatorShare = field.operatorExpenseShare ?? 0;
      totalMyShare += total * (operatorShare / 100);
    });
});



    // 2. Calculate what you’ve logged as YOUR share
    const purchasedMyShare = purchases
      .filter(p => p.isFullAmount === false)
      .reduce((sum, p) => sum + (p.normalizedAmount || 0), 0);

    const diff = purchasedMyShare - totalMyShare;

    return (
      <>
      <div><strong>Total Applied (Your Share):</strong> {totalMyShare.toFixed(1)} {getDisplayUnitLabel()}</div>
<div><strong>Total Purchased (Logged by You):</strong> {purchasedMyShare.toFixed(1)} {getDisplayUnitLabel()}</div>
<div className={`mt-1 font-medium ${Math.abs(diff) < 1 ? 'text-green-700' : 'text-yellow-700'}`}>
  {Math.abs(diff) < 1
    ? '✅ Your purchase log matches your expected usage.'
    : `⚠️ You are ${diff > 0 ? 'over' : 'under'} by ${Math.abs(diff).toFixed(1)} ${getDisplayUnitLabel()}.`}
</div>

      </>
    );
  })()}
</div>
{/* 🔹 Over/Under Usage Warning */}


{/* 🔹 View Fields / Jobs Action */}
<button
  onClick={() => {
    alert('Coming soon: Show filtered field/job list for this product.');
  }}
  className="mt-4 text-sm text-blue-600 hover:underline"
>
  View Fields Where This Product Was Used
</button>

      </div>
    </div>
  );
}
