// src/pages/LogProductPurchase.jsx
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { useCropYear } from '../context/CropYearContext';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function LogProductPurchase() {
  const { cropYear } = useCropYear();
  const navigate = useNavigate();
  const [products, setProducts] = useState({});
  const [lines, setLines] = useState([
    { productId: '', amount: '', unit: '', cost: '', rate: '', note: '', isFullAmount: false }
,
  ]);
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
const [searchParams] = useSearchParams();
const [priceMode, setPriceMode] = useState('total'); // 'total' or 'rate'

const editingId = searchParams.get('id');
const line = lines[0];
const amount = parseFloat(line.amount) || 0;
const cost = parseFloat(line.cost) || 0;
const rate = parseFloat(line.rate) || 0;

const calculatedRate = amount && cost ? (cost / amount).toFixed(4) : '';
const calculatedCost = amount && rate ? (amount * rate).toFixed(2) : '';

const rateMismatch = amount && rate && cost && Math.abs(cost - amount * rate) > 1;

  useEffect(() => {
    const fetchProducts = async () => {
      const snap = await getDocs(collection(db, 'products'));
      const map = {};
      snap.docs.forEach(doc => map[doc.id] = doc.data());
      setProducts(map);
    };
    fetchProducts();
  }, []);
useEffect(() => {
  if (editingId) {
    const loadPurchase = async () => {
      const snap = await getDoc(doc(db, 'inputPurchases', editingId));
      const data = snap.data();

      setVendor(data.vendor || '');
      setInvoiceId(data.invoiceId || '');
      setDate(data.date?.toDate?.().toISOString().slice(0, 10) || '');
      setLines([{
        productId: data.productId,
        amount: data.amount,
        unit: data.unit,
        cost: data.cost || '',
        rate: data.rate || '',
        note: data.note || '',
        isFullAmount: data.isFullAmount || false,
      }]);
    };

    loadPurchase();
  }
}, [editingId]); // ✅ Only run once when editingId changes


  const getAllowedUnits = (type) => {
    switch ((type || '').toLowerCase()) {
      case 'seed': return ['bushel', 'unit', 'lb', 'seed'];
      case 'fertilizer': return ['ton', 'lb'];
      case 'chemical': return ['gal', 'oz', 'pt'];
      default: return [];
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (const line of lines) {
      const product = products[line.productId];
      if (!product) continue;

      const rawAmount = parseFloat(line.amount);
      const unit = line.unit.toLowerCase();
      let normalized = rawAmount;
const amount = parseFloat(line.amount) || 0;
let rate = null;
let cost = null;

if (priceMode === 'rate') {
  rate = parseFloat(line.rate) || 0;
  cost = amount * rate;
} else {
  cost = parseFloat(line.cost) || 0;
  rate = amount ? cost / amount : 0;
}

      const type = (product.type || '').toLowerCase();
      const crop = (product.crop || '').toLowerCase();

      if (type === 'seed') {
        if (unit === 'bushel') {
          normalized *= crop.includes('rice') ? 45 : crop.includes('soybean') ? 60 : 1;
        } else if (unit === 'unit') {
          normalized *= crop.includes('rice') ? 900000 : crop.includes('soybean') ? 140000 : 1;
        }
      } else if (type === 'fertilizer') {
        if (unit === 'ton') normalized *= 2000;
      } else if (type === 'chemical') {
        if (unit === 'gal') normalized *= 128;
        if (unit === 'pt') normalized *= 16;
      }

     const purchaseData = {
  productId: line.productId,
  cropYear,
  vendor,
  amount: rawAmount,
  unit,
cost,
rate,
costMode: priceMode,

  note: line.note || '',
  invoiceId: invoiceId || '',
  date: new Date(date),
  normalizedAmount: normalized,
  normalizedUnit:
    type === 'seed' && (unit === 'unit' || unit === 'seed')
      ? 'seed'
      : type === 'seed'
      ? 'lb'
      : type === 'fertilizer'
      ? 'lb'
      : type === 'chemical'
      ? 'oz'
      : unit,
  isFullAmount: line.isFullAmount,
};

  // 🔹 DROP THIS RIGHT HERE
  if (editingId) {
    await updateDoc(doc(db, 'inputPurchases', editingId), purchaseData);
  } else {
    await addDoc(collection(db, 'inputPurchases'), purchaseData);
  }
}

    navigate('/financial/products');
  };

  const addLine = () => {
    setLines([...lines, { productId: '', amount: '', unit: '', cost: '', rate: '', note: '' }]);
  };

const updateLine = (i, field, value) => {
  const copy = [...lines];
  copy[i][field] = value;
  setLines(copy);
};


  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">🧾 Log Product Purchase</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold">Vendor</label>
            <input type="text" className="border rounded w-full px-2 py-1" value={vendor} onChange={(e) => setVendor(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold">Date</label>
            <input type="date" className="border rounded w-full px-2 py-1" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold">Invoice ID</label>
            <input type="text" className="border rounded w-full px-2 py-1" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} />
          </div>
        </div>

        {lines.map((line, i) => {
          const product = products[line.productId] || {};
          const allowedUnits = getAllowedUnits(product.type);

          return (
            <div key={i} className="border rounded p-4 space-y-2 bg-gray-50">
              <div className="flex gap-4 items-center">
             <div className="border rounded p-4 space-y-4 bg-gray-50">
  {/* 🔹 Top Row: Product, Amount, Unit */}
  <div className="flex gap-4">
    <div className="flex-1">
      <label className="block text-sm font-semibold">Product</label>
      <select
        value={lines[0].productId}
        onChange={e => setLines([{ ...lines[0], productId: e.target.value }])}
        className="border rounded w-full px-2 py-1"
        required
      >
        <option value="">-- Select Product --</option>
        {Object.entries(products).map(([id, p]) => (
          <option key={id} value={id}>{p.name}</option>
        ))}
      </select>
    </div>
    <div className="flex-1">
      <label className="block text-sm font-semibold">Amount</label>
      <input
        type="number"
        step="any"
        value={lines[0].amount}
        onChange={e => setLines([{ ...lines[0], amount: e.target.value }])}
        className="border rounded w-full px-2 py-1"
        required
      />
    </div>
    <div className="flex-1">
      <label className="block text-sm font-semibold">Unit</label>
      <select
        value={lines[0].unit}
        onChange={e => setLines([{ ...lines[0], unit: e.target.value }])}
        className="border rounded w-full px-2 py-1"
        required
      >
        <option value="">-- Select Unit --</option>
        {getAllowedUnits(products[lines[0].productId]?.type).map(unit => (
          <option key={unit} value={unit}>{unit}</option>
        ))}
      </select>
    </div>
  </div>

  {/* 🔹 Second Row: Cost, Rate, Notes */}
  <div className="flex gap-4">
   {/* 🔹 Combined Price Input + Dropdown */}
<div className="flex-1">
  <label className="block text-sm font-semibold">
    {priceMode === 'rate' ? 'Rate ($/unit)' : 'Total Cost ($)'}
  </label>
  <div className="flex">
    <input
      type="number"
      step="any"
      value={priceMode === 'rate' ? line.rate : line.cost}
      onChange={(e) => {
        const updated = {
          ...line,
          [priceMode === 'rate' ? 'rate' : 'cost']: e.target.value
        };
        setLines([updated]);
      }}
      className="border rounded-l px-2 py-1 w-full"
    />
    <select
      value={priceMode}
      onChange={e => setPriceMode(e.target.value)}
      className="border rounded-r px-2 py-1 bg-white"
    >
      <option value="total">Total</option>
      <option value="rate">Per Unit</option>
    </select>
  </div>
</div>
{priceMode === 'rate' && line.amount && line.rate && (
  <div className="text-xs text-gray-500 mt-1">
    💡 Total ≈ ${(parseFloat(line.amount || 0) * parseFloat(line.rate || 0)).toFixed(2)}
  </div>
)}

{priceMode === 'total' && line.amount && line.cost && (
  <div className="text-xs text-gray-500 mt-1">
    💡 Rate ≈ ${(parseFloat(line.cost || 0) / parseFloat(line.amount || 1)).toFixed(4)} per unit
  </div>
)}

 

    <div className="flex-1">
      <label className="block text-sm font-semibold">Notes</label>
      <input
        type="text"
        value={lines[0].note}
        onChange={e => setLines([{ ...lines[0], note: e.target.value }])}
        className="border rounded w-full px-2 py-1"
      />
    </div>
  </div>

  {/* 🔹 Checkbox Row */}
  <div className="pt-1">
    <label className="inline-flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={lines[0].isFullAmount}
        onChange={e => setLines([{ ...lines[0], isFullAmount: e.target.checked }])}
      />
      This purchase covers the full amount (not just my share)
    </label>
  </div>
</div>

              </div>
             

            </div>
          );
        })}

        <button type="button" onClick={addLine} className="text-blue-600 text-sm hover:underline">+ Add Another Product</button>

        <div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded mt-2">
  {editingId ? 'Update Purchase' : 'Log Purchase'}
</button>

        </div>
      </form>
    </div>
  );
}
