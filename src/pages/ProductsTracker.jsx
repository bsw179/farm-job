// ProductsTracker.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useCropYear } from '../context/CropYearContext';
import { Link } from 'react-router-dom';
import LogInputsPurchase from '../components/LogInputsPurchase';
import ProductSummaryModal from "../components/ProductSummaryModal";

function getLastPurchaseDate(productId, purchases) {
  const matching = purchases
    .filter(p => p.productId === productId && p.date)
    .map(p => new Date(p.date));

  if (matching.length === 0) return null;

  const latest = new Date(Math.max(...matching));
  return latest.toLocaleDateString(); // or use your preferred format
}
function getProductPurchaseStats(productId, purchases) {
  let totalNormalized = 0;
  let totalCost = 0;
  let totalAmount = 0; // this is amount of purchased units

  for (const p of purchases) {
    if (p.productId !== productId) continue;
    const amount = parseFloat(p.amount);
    const unitSize = parseFloat(p.unitSize);
    const cost = parseFloat(p.cost);

    if (!isNaN(amount) && !isNaN(unitSize)) {
      totalNormalized += amount * unitSize;
      totalAmount += amount;

      if (!isNaN(cost)) {
        totalCost += cost;
      }
    }
  }

  return {
    totalPurchased: totalNormalized,              // normalized amount (e.g. lbs, seeds)
    totalCost,                                    // total invoice cost
    avgNormalizedUnitPrice: totalNormalized > 0 ? totalCost / totalNormalized : 0,
    avgPurchaseUnitPrice: totalAmount > 0 ? totalCost / totalAmount : 0,
  };
}

function ProductsTracker() {
  const { cropYear } = useCropYear();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [jobsByField, setJobsByField] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [appliedTotals, setAppliedTotals] = useState({});
  const [appliedByOperator, setAppliedByOperator] = useState({});
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [sortOption, setSortOption] = useState('name');
const [isFilterOpen, setIsFilterOpen] = useState(false);

const [filters, setFilters] = useState({
  types: [], // e.g., ['Chemical', 'Seed']
  crops: [], // e.g., ['Rice']
  vendor: '',
  startDate: '',
  endDate: '',
  restrictedOnly: false,
});
const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
const [modalProducts, setModalProducts] = useState([]);
const [editPurchase, setEditPurchase] = useState(null);
const [summaryOpen, setSummaryOpen] = useState(false);
const [summaryProductId, setSummaryProductId] = useState(null);

  // Load everything
  const loadData = async () => {
  const [productSnap, jobSnap, purchaseSnap] = await Promise.all([
    getDocs(collection(db, 'products')),
    getDocs(collection(db, 'jobsByField')),
    getDocs(collection(db, 'inputPurchases')),
  ]);

  const allProducts = productSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const filteredJobs = jobSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(job => job.cropYear === cropYear && job.status !== 'Planned');

  const filteredPurchases = purchaseSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(p => String(p.cropYear) === String(cropYear));
console.log('📦 Purchases loaded:', filteredPurchases);

  const usedProductIds = new Set();
  filteredJobs.forEach(job => {
    (job.products || []).forEach(p => {
      if (p.productId) usedProductIds.add(p.productId);
    });
  });

  const purchasedProductIds = new Set(filteredPurchases.map(p => p.productId));
  const filteredProducts = allProducts.filter(p =>
    usedProductIds.has(p.id) || purchasedProductIds.has(p.id)
  );

  setProducts(filteredProducts);
  setJobsByField(filteredJobs);
  setPurchases(filteredPurchases);
};

useEffect(() => {
  loadData();
}, [cropYear]);

useEffect(() => {
  const totals = {};
  const operatorApplied = {}; // { productId: { PCF: x, TCF: y } }

  for (const job of jobsByField) {
    const jobProducts = job.products || [];
    const operator = job.operator || 'Unknown';

    for (const p of jobProducts) {
      const id = p.productId;
      const rawUnit = (p.unit || '').toLowerCase();
      let appliedAmount = 0;
      let normalizedUnit = '';

      if (rawUnit === '%v/v' && job.waterVolume) {
        const rate = parseFloat(p.rate || 0);
        const water = parseFloat(job.waterVolume);
        if (!isNaN(rate) && !isNaN(water)) {
          appliedAmount = rate * water * 128;
          normalizedUnit = 'fl oz';
        } else {
          continue;
        }
      } else {
        const rate = parseFloat(p.rate || 0);
        const acres = parseFloat(job.acres || 0);
        appliedAmount = rate * acres;

        if (rawUnit.includes('/')) {
          normalizedUnit = rawUnit.split('/')[0].trim();
        } else if (rawUnit.includes('%')) {
          normalizedUnit = rawUnit.replace('%', '').trim();
        } else {
          normalizedUnit = rawUnit;
        }
      }

      if (!totals[id]) {
        totals[id] = { amount: 0, unit: normalizedUnit };
      }
      totals[id].amount += appliedAmount;

      if (!operatorApplied[id]) {
        operatorApplied[id] = { PCF: 0, TCF: 0 };
      }

      if (operator === 'PCF' || operator === 'TCF') {
        operatorApplied[id][operator] += appliedAmount;
      }
    }
  }

  setAppliedTotals(totals);
  setAppliedByOperator(operatorApplied);
}, [jobsByField]);

  // Compute applied totals
 useEffect(() => {
  const totals = {};

  for (const job of jobsByField) {
  const jobProducts = job.products || [];

  for (const p of jobProducts) {
    const id = p.productId;
    const rawUnit = (p.unit || '').toLowerCase();
    let appliedAmount = 0;
    let normalizedUnit = '';

    if (rawUnit === '%v/v' && job.waterVolume) {
      const rate = parseFloat(p.rate || 0);
      const water = parseFloat(job.waterVolume);
      if (!isNaN(rate) && !isNaN(water)) {
        appliedAmount = rate * water * 128; // convert to fl oz
        normalizedUnit = 'fl oz';
      } else {
        continue; // skip if data is invalid
      }
    } else {
      const rate = parseFloat(p.rate || 0);
      const acres = parseFloat(job.acres || 0);
      appliedAmount = rate * acres;

      // Normalize unit (e.g. fl oz/acre → fl oz)
      if (rawUnit.includes('/')) {
        normalizedUnit = rawUnit.split('/')[0].trim();
      } else if (rawUnit.includes('%')) {
        normalizedUnit = rawUnit.replace('%', '').trim();
      } else {
        normalizedUnit = rawUnit;
      }
    }

    if (!totals[id]) {
      totals[id] = { amount: 0, unit: normalizedUnit };
    }

    totals[id].amount += appliedAmount;
  }
}


  setAppliedTotals(totals);
}, [jobsByField]);


// Count all products used or purchased in this crop year
const allUsedOrPurchasedIds = new Set();

jobsByField.forEach(job => {
  (job.products || []).forEach(p => {
    if (p.productId) allUsedOrPurchasedIds.add(p.productId);
  });
});

purchases.forEach(p => {
  if (p.productId) allUsedOrPurchasedIds.add(p.productId);
});

const productIdToCrops = {};

jobsByField.forEach(job => {
  const jobCrop = job.crop;
  const jobProducts = job.products || [];

  jobProducts.forEach(p => {
    if (!p.productId || !jobCrop) return;
    if (!productIdToCrops[p.productId]) {
      productIdToCrops[p.productId] = new Set();
    }
    productIdToCrops[p.productId].add(jobCrop);
  });
});

const filteredProducts = products.filter(p => {
  const matchesText = p.name.toLowerCase().includes(filterText.toLowerCase());
  const matchesType = filters.types.length === 0 || filters.types.includes(p.type);

  const productCrops = productIdToCrops[p.id] || new Set();
  const matchesCrop =
    filters.crops.length === 0 ||
    [...productCrops].some(crop => filters.crops.includes(crop));
const matchesVendor = filters.vendor === '' ||
  purchases.some(p => p.productId === p.id && p.vendor === filters.vendor);
const matchesDate =
  !filters.startDate && !filters.endDate
    ? true
    : purchases.some(p => {
        if (p.productId !== p.id || !p.date) return false;
        const date = new Date(p.date);
        const start = filters.startDate ? new Date(filters.startDate) : null;
        const end = filters.endDate ? new Date(filters.endDate) : null;
        if (start && date < start) return false;
        if (end && date > end) return false;
        return true;
      });


return matchesText && matchesType && matchesCrop && matchesVendor && matchesDate;
});

console.log('✅ Products after filtering:', filteredProducts.map(p => p.name));



const sortedProducts = [...filteredProducts].sort((a, b) => {
  if (sortOption === 'name') {
    return a.name.localeCompare(b.name);
  }

  if (sortOption === 'type') {
    return (a.type || '').localeCompare(b.type || '');
  }

  if (sortOption === 'recent') {
    const aDate = getLastPurchaseDate(a.id, purchases) || '';
    const bDate = getLastPurchaseDate(b.id, purchases) || '';
    return new Date(bDate) - new Date(aDate);
  }

  if (sortOption === 'cost') {
    const aCost = getProductPurchaseStats(a.id, purchases).totalCost || 0;
    const bCost = getProductPurchaseStats(b.id, purchases).totalCost || 0;
    return bCost - aCost;
  }

  return 0;
});

// Build a map: productId -> Set of crops it's used on

const allCropsUsed = [...new Set(
  Object.values(productIdToCrops)
    .flatMap(set => [...set])
)];

const allVendors = [...new Set(
  purchases
    .map(p => p.vendor)
    .filter(Boolean)
)];

 return (
  <div className="p-4">
<div className="flex items-center justify-between mb-4">
  <h2 className="text-xl font-semibold">Inputs Tracker - {cropYear}</h2>

<button
  className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
  disabled={selectedProductIds.length === 0}
  onClick={() => {
    const productsToLog = selectedProductIds.map(id => ({ id }));
    setModalProducts(productsToLog);
    setEditPurchase(null);
    setPurchaseModalOpen(true);
  }}
>
  {selectedProductIds.length > 0
    ? `Log Purchase for ${selectedProductIds.length} Selected`
    : 'Log Purchase'}
</button>

</div>
{/* Financial Summary Bar */}
<div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 mb-4 border-b pb-2">
  <div>
    <span className="font-semibold">{products.length}</span>
    {' of '}
    <span className="font-semibold">{allUsedOrPurchasedIds.size}</span>
    {' Products'}
  </div>

  <div className="border-l pl-4">
    <span className="font-semibold">
      ${purchases.reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0).toLocaleString()}
    </span>{' '}
    Purchased year-to-date
  </div>

  {['Chemical', 'Fertilizer', 'Seed Treatment', 'Seed'].map(type => {
    const typeCost = purchases.reduce((sum, p) => {
      const prod = products.find(prod => prod.id === p.productId);
      if (!prod || prod.type !== type) return sum;
      return sum + (parseFloat(p.cost) || 0);
    }, 0);

    return (
      <div key={type} className="border-l pl-4">
        <span className="font-semibold">${typeCost.toLocaleString()}</span>{' '}
        {type}
      </div>
    );
  })}
</div>
<button
  onClick={() => setIsFilterOpen(true)}
  className="border border-gray-300 text-sm rounded px-3 py-1 mr-2 flex items-center gap-1"
>
  <span>Filters</span>
</button>

<div className="flex justify-between items-center mb-4">
  <input
    type="text"
    placeholder="Search by product name..."
    className="border p-2 rounded w-full max-w-md"
    value={filterText}
    onChange={(e) => setFilterText(e.target.value)}
  />

  <select
    className="ml-4 border p-2 rounded"
    value={sortOption}
    onChange={(e) => setSortOption(e.target.value)}
  >
    <option value="name">Alphabetical</option>
    <option value="type">Product Type</option>
    <option value="recent">Last Purchase (newest)</option>
    <option value="cost">Total Cost (highest)</option>
  </select>
</div>

    {/* DESKTOP TABLE VIEW */}
    <div className="hidden md:block">
      <table className="w-full text-sm border">
    <thead className="bg-gray-100">
  <tr>
    <th className="border px-2 py-1 text-center">✓</th>
    <th className="border px-2 py-1">Product</th>
    <th className="border px-2 py-1">Type</th>
    <th className="border px-2 py-1">Applied</th>
    <th className="border px-2 py-1">Purchased</th>
    <th className="border px-2 py-1">Remaining</th>
    <th className="border px-2 py-1">Avg Unit Price</th>
    <th className="border px-2 py-1">Cost</th>
    <th className="border px-2 py-1">Actions</th>
  </tr>
</thead>


        <tbody>
         {sortedProducts.map(p => {
          
  const applied = appliedTotals[p.id];
  const operatorBreakdown = appliedByOperator[p.id] || {};
const appliedPCF = operatorBreakdown.PCF || 0;
const appliedTCF = operatorBreakdown.TCF || 0;

  const lastPurchaseDate = getLastPurchaseDate(p.id, purchases);
  const {
  totalPurchased,
  totalCost,
  avgNormalizedUnitPrice,
  avgPurchaseUnitPrice
} = getProductPurchaseStats(p.id, purchases);
const matchingPurchases = purchases
  .filter(pur => pur.productId === p.id && pur.date)
  .sort((a, b) => new Date(b.date) - new Date(a.date));

const lastPurchase = matchingPurchases[0];
const lastVendor = lastPurchase?.vendorName || '';

const lastAmount = lastPurchase?.amount || '';
const lastUnit = lastPurchase?.unit || '';
const lastCost = lastPurchase?.cost ? parseFloat(lastPurchase.cost).toFixed(2) : '';


  const appliedAmount = applied ? applied.amount : 0;
  const remaining = totalPurchased - appliedAmount;
  const cost = totalCost;
 
            return (
            <tr
  key={p.id}
  className="bg-white shadow-sm border rounded-md align-top hover:bg-gray-50"
>
  <td className="border px-4 py-3 text-center">
    <input
      type="checkbox"
      checked={selectedProductIds.includes(p.id)}
      onChange={() => {
        setSelectedProductIds(prev =>
          prev.includes(p.id)
            ? prev.filter(id => id !== p.id)
            : [...prev, p.id]
        );
      }}
    />
  </td>
 
                <td className="border px-4 py-3">
                  <div className="text-blue-600 font-medium text-sm cursor-pointer hover:underline">
                    <button
  onClick={() => {
    setSummaryProductId(p.id);
    setSummaryOpen(true);
  }}
  className="text-blue-600 underline hover:text-blue-800"
>
  {p.name}
</button>

                  </div>
                  <div className="text-xs text-gray-500 italic">
{p.seedsPerUnit ? `${Math.round(p.seedsPerUnit / 1000)}k seeds/unit` : ''}

                  </div>
                </td>
                <td className="border px-4 py-3 text-sm text-gray-700">{p.type}</td>
         <td className="border px-4 py-3 text-sm text-right">
  {applied ? (
    <>
      {applied.amount.toLocaleString()} {applied.unit}
      <div className="text-xs text-gray-500">
        {['PCF', 'TCF'].map(partner => {
          const appliedVal = operatorBreakdown[partner] || 0;
          if (!appliedVal) return null;
          return (
            <div key={partner}>
              {partner}: {appliedVal.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </div>
          );
        })}
      </div>
    </>
  ) : '--'}
</td>


               <td className="border px-4 py-3 text-sm text-right">
  {totalPurchased ? totalPurchased.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '--'}
</td>
<td className="border px-4 py-3 text-sm text-right">
  {totalPurchased ? (
    <>
      {(totalPurchased - appliedAmount).toLocaleString(undefined, { maximumFractionDigits: 1 })}
      <div className="text-xs text-gray-500">
        {['PCF', 'TCF'].map(partner => {
          const applied = operatorBreakdown[partner] || 0;
          const purchased = purchases
            .filter(pur => pur.productId === p.id && pur.operator === partner)
            .reduce((sum, pur) => sum + (parseFloat(pur.normalizedAmount) || 0), 0);

          if (!purchased && !applied) return null;

          const remaining = purchased - applied;

          return (
            <div key={partner}>
              {partner}: {remaining.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </div>
          );
        })}
      </div>
    </>
  ) : '--'}
</td>


<td className="border px-4 py-3 text-sm text-right">
  {avgPurchaseUnitPrice ? `$${avgPurchaseUnitPrice.toFixed(2)}` : '--'}
</td>

<td className="border px-4 py-3 text-sm text-right">
  {cost ? `$${cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '--'}
</td>


                <td className="border px-4 py-3 text-sm text-blue-600 underline text-right">
                  <div className="flex flex-col items-end text-sm">
  {lastPurchaseDate && (
<div
  className="text-xs text-gray-500"
  style={{ whiteSpace: 'pre-line' }}
  title={`Vendor: ${lastVendor}\nAmount: ${lastAmount} ${lastUnit}\nCost: $${lastCost}`}
>
  Last: {lastPurchaseDate}
</div>

  )}
  <div className="flex flex-col items-end text-sm">

  <button
    className="text-blue-600 underline"
    onClick={() => {
      setModalProducts([{ id: p.id }]);
      setEditPurchase(null);
      setPurchaseModalOpen(true);
    }}
  >
    Log purchase
  </button>
</div>

</div>

                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* MOBILE CARD VIEW */}
    <div className="block md:hidden mt-4 space-y-3">
      {sortedProducts.map(p => {
        const matchingPurchases = purchases
  .filter(pur => pur.productId === p.id && pur.date)
  .sort((a, b) => new Date(b.date) - new Date(a.date));

const lastPurchase = matchingPurchases[0];
const lastVendor = lastPurchase?.vendorName || '';
const lastAmount = lastPurchase?.amount || '';
const lastUnit = lastPurchase?.unit || '';
const lastCost = lastPurchase?.cost ? parseFloat(lastPurchase.cost).toFixed(2) : '';

  const applied = appliedTotals[p.id];

  const lastPurchaseDate = getLastPurchaseDate(p.id, purchases);
  const { totalPurchased, totalCost, avgUnitPrice } = getProductPurchaseStats(p.id, purchases);
const operatorBreakdown = appliedByOperator[p.id] || {};
const appliedPCF = operatorBreakdown.PCF || 0;
const appliedTCF = operatorBreakdown.TCF || 0;

  const appliedAmount = applied ? applied.amount : 0;
  const remaining = totalPurchased - appliedAmount;
  const cost = appliedAmount * avgUnitPrice;

       const appliedDisplay = applied
  ? `${applied.amount.toLocaleString()} ${applied.unit} applied`
  : 'No usage recorded';

const appliedBreakdown = applied
  ? `PCF: ${appliedPCF.toLocaleString(undefined, { maximumFractionDigits: 1 })}, TCF: ${appliedTCF.toLocaleString(undefined, { maximumFractionDigits: 1 })}`
  : '';


        return (
          <div key={p.id} className="bg-white border shadow-sm rounded p-3">
  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
    {p.type || 'Other'}
  </div>
  <div className="flex items-center justify-between mb-2">
  <input
    type="checkbox"
    checked={selectedProductIds.includes(p.id)}
    onChange={() => {
      setSelectedProductIds(prev =>
        prev.includes(p.id)
          ? prev.filter(id => id !== p.id)
          : [...prev, p.id]
      );
    }}
  />
</div>

<button
  onClick={() => {
    setSummaryProductId(p.id);
    setSummaryOpen(true);
  }}
  className="text-sm font-bold text-blue-600 underline hover:text-blue-800"
>
  {p.name}
</button>

  <div className="text-sm text-gray-600 mt-1">{appliedDisplay}</div>
{applied && (
  <div className="text-xs text-gray-500">{appliedBreakdown}</div>
)}
{applied && totalPurchased > 0 && (
  <>
    <div className="text-sm text-gray-600 mt-1">
      Remaining: {(totalPurchased - applied.amount).toLocaleString(undefined, { maximumFractionDigits: 1 })}
    </div>
    <div className="text-xs text-gray-500">
      PCF: {(totalPurchased - appliedPCF).toLocaleString(undefined, { maximumFractionDigits: 1 })}, TCF: {(totalPurchased - appliedTCF).toLocaleString(undefined, { maximumFractionDigits: 1 })}
    </div>
  </>
)}



  {/* ✅ INSERT HERE: below appliedDisplay */}
 

  <div className="text-right mt-2">
  <div className="flex flex-col items-end text-sm">
 {lastPurchaseDate && (
 <div
  className="text-xs text-gray-500"
  style={{ whiteSpace: 'pre-line' }}
  title={`Vendor: ${lastVendor}\nAmount: ${lastAmount} ${lastUnit}\nCost: $${lastCost}`}
>
  Last: {lastPurchaseDate}
</div>

)}

  <button
    className="text-blue-600 underline"
    onClick={() => {
      setModalProducts([{ id: p.id }]);
      setEditPurchase(null);
      setPurchaseModalOpen(true);
    }}
  >
    Log purchase
  </button>
</div>

  </div>
</div>
        );
      })}
    </div>
    {isFilterOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
    <div className="bg-white rounded shadow-lg w-full max-w-md p-6 relative">
      <button
        onClick={() => setIsFilterOpen(false)}
        className="absolute top-2 right-2 text-gray-500 hover:text-black"
      >
        ✕
      </button>

      <h2 className="text-lg font-semibold mb-4">Filters</h2>

      {/* Temporary placeholder: filter options go here */}
      <div className="space-y-2 text-sm">
<div>
  <label className="block text-sm font-medium mb-1">Product Type</label>
  <div className="flex flex-wrap gap-2">
    {['Chemical', 'Fertilizer', 'Seed Treatment', 'Seed'].map(type => (
      <button
        key={type}
        className={`px-3 py-1 rounded border text-sm ${
          filters.types.includes(type)
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 border-gray-300'
        }`}
        onClick={() => {
          setFilters(prev => ({
            ...prev,
            types: prev.types.includes(type)
              ? prev.types.filter(t => t !== type)
              : [...prev.types, type]
          }));
        }}
        type="button"
      >
        {type}
      </button>
    ))}
  </div>
</div>
<div>
  <label className="block text-sm font-medium mb-1">Crops</label>
  <div className="flex flex-wrap gap-2">
   {allCropsUsed.map(crop => (
  <button
    key={crop}
    className={`px-3 py-1 rounded border text-sm ${
      filters.crops.includes(crop)
        ? 'bg-blue-600 text-white'
        : 'bg-white text-gray-700 border-gray-300'
    }`}
    onClick={() => {
      setFilters(prev => ({
        ...prev,
        crops: prev.crops.includes(crop)
          ? prev.crops.filter(c => c !== crop)
          : [...prev.crops, crop]
      }));
    }}
    type="button"
  >
    {crop}
  </button>
))}

  </div>
</div>
<div>
  <label className="block text-sm font-medium mb-1">Vendor</label>
  <select
    value={filters.vendor}
    onChange={(e) => setFilters(prev => ({ ...prev, vendor: e.target.value }))}
    className="w-full border rounded p-2 text-sm"
  >
    <option value="">All Vendors</option>
    {allVendors.map(v => (
      <option key={v} value={v}>{v}</option>
    ))}
  </select>
</div>
<div className="flex gap-4">
  <div className="flex-1">
    <label className="block text-sm font-medium mb-1">Start date</label>
    <input
      type="date"
      value={filters.startDate}
      onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
      className="w-full border rounded p-2 text-sm"
    />
  </div>

  <div className="flex-1">
    <label className="block text-sm font-medium mb-1">End date</label>
    <input
      type="date"
      value={filters.endDate}
      onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
      className="w-full border rounded p-2 text-sm"
    />
  </div>
</div>
      
      </div>

      <div className="flex justify-between mt-6">
        <button
          className="text-red-600 text-sm"
          onClick={() => {
            setFilters({
              types: [],
              crops: [],
              vendor: '',
              startDate: '',
              endDate: '',
              restrictedOnly: false,
            });
            setIsFilterOpen(false);
          }}
        >
          Clear filters
        </button>

        <button
          onClick={() => setIsFilterOpen(false)}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
        >
          Apply
        </button>
      </div>
    </div>
  </div>
)}
<LogInputsPurchase
  isOpen={purchaseModalOpen}
  onClose={() => {
    setPurchaseModalOpen(false);
    loadData(); // Re-fetch Firestore data after modal closes
  }}
  cropYear={cropYear}
  initialProducts={modalProducts}
  editPurchase={editPurchase}
/>

<ProductSummaryModal
  isOpen={summaryOpen}
  productId={summaryProductId}
  onClose={() => setSummaryOpen(false)}
/>

  </div>
);
}
export default ProductsTracker;
