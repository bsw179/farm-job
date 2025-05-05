// LogProductPurchase.jsx — Dropdowns for standardized units
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';

function LogProductPurchase() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedProductIds = location.state?.selectedProductIds || [];

  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [cropYear, setCropYear] = useState('2025');
  const [lines, setLines] = useState([]);
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  useEffect(() => {
    const loadData = async () => {
      const productSnap = await getDocs(collection(db, 'products'));
      const vendorSnap = await getDocs(collection(db, 'vendors'));

      const productList = productSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const vendorList = vendorSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setProducts(productList);
      setVendors(vendorList);

     if (editId) {
  const docRef = doc(db, 'inputPurchases', editId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    setLines([{ ...snap.data(), id: snap.id }]);
  }
} else if (selectedProductIds.length > 0) {
  const selectedLines = selectedProductIds.map(id => ({
    productId: id,
    linkedSeedProductId: '',
    vendorId: '',
    vendorName: '',
    invoiceId: '',
    date: '',
    amount: '',
    unit: '',
    unitSize: '',
    cost: '',
    rate: '',
    note: ''
  }));
  setLines(selectedLines);
} else {
  setLines([{
    productId: '',
    linkedSeedProductId: '',
    vendorId: '',
    vendorName: '',
    invoiceId: '',
    date: '',
    amount: '',
    unit: '',
    unitSize: '',
    cost: '',
    rate: '',
    note: ''
  }]);
}

    };
    loadData();
  }, [selectedProductIds]);

  const getUnitOptions = (productId) => {
    const product = products.find(p => p.id === productId);
    const type = (product?.type || '').toLowerCase();

    if (type === 'chemical') return ['fl oz', 'pint', 'quart', 'gallon', 'oz dry', 'lb'];
    if (type === 'fertilizer') return ['lb', 'ton'];
    if (type === 'seed') return ['unit', 'lb', 'bushel', 'seeds'];
    return ['unit', 'lb', 'gal'];
  };

  const updateLine = (index, field, value) => {
    const newLines = [...lines];
    newLines[index][field] = value;
if (field === 'unit') {
  const unitDefaults = {
    'gallon': 128,
    'quart': 32,
    'pint': 16,
    'fl oz': 1,
    'oz dry': 1,
    'lb': 1,
    'ton': 2000,
    'unit': 1,
    'seeds': 1,
    'bushel': 60 // default to soybean unless overridden manually
  };
  newLines[index].unitSize = unitDefaults[value] || '';
}

    const { amount, cost, rate } = newLines[index];
    const a = parseFloat(amount);
    const c = parseFloat(cost);
    const r = parseFloat(rate);

    if (field === 'amount' && r && !isNaN(a)) {
      newLines[index].cost = (a * r).toFixed(2);
    } else if (field === 'cost' && a && !isNaN(c)) {
      newLines[index].rate = (c / a).toFixed(2);
    } else if (field === 'rate' && a && !isNaN(r)) {
      newLines[index].cost = (a * r).toFixed(2);
    }

    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, {
      productId: '',
      linkedSeedProductId: '',
      vendorId: '',
      vendorName: '',
      invoiceId: '',
      date: '',
      amount: '',
      unit: '',
      unitSize: '',
      cost: '',
      rate: '',
      note: ''
    }]);
  };

  const handleSubmit = async () => {
    for (let line of lines) {
      const docData = {
  ...line,
  cropYear: String(cropYear),
  amount: parseFloat(line.amount),
  unitSize: parseFloat(line.unitSize) || 1,
  cost: parseFloat(line.cost),
  rate: parseFloat(line.rate),
  timestamp: Timestamp.now()
};

      if (editId) {
  const ref = doc(db, 'inputPurchases', editId);
  await setDoc(ref, docData, { merge: true });
} else {
  await addDoc(collection(db, 'inputPurchases'), docData);
}

    }
navigate('/financial/ledger');
  };
const getNormalizedUnit = (unit) => {
  if (unit === 'gallon' || unit === 'quart' || unit === 'pint') return 'fl oz';
  if (unit === 'ton') return 'lb';
  if (unit === 'bushel') return 'lb';
  return unit;
};

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Log Product Purchase</h1>

      {lines.map((line, i) => {
        const unitOptions = getUnitOptions(line.productId);
        return (
          <div key={i} className="border p-4 mb-4 rounded bg-white shadow">
            <div className="grid grid-cols-2 gap-4">
              <select
                className="border p-2 rounded"
                value={line.productId}
                onChange={(e) => updateLine(i, 'productId', e.target.value)}
              >
                <option value="">Select Product</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {products.find(p => p.id === line.productId)?.type === 'Seed Treatment' && (
                <select
                  className="border p-2 rounded"
                  value={line.linkedSeedProductId}
                  onChange={(e) => updateLine(i, 'linkedSeedProductId', e.target.value)}
                >
                  <option value="">Link to Seed</option>
                  {products.filter(p => p.type === 'Seed').map(seed => (
                    <option key={seed.id} value={seed.id}>{seed.name}</option>
                  ))}
                </select>
              )}

              <select
                className="border p-2 rounded"
                value={line.vendorId}
              onChange={(e) => {
  const vendorId = e.target.value;
  const vendorName = vendors.find(v => v.id === vendorId)?.name || '';
  updateLine(i, 'vendorId', vendorId);
  updateLine(i, 'vendorName', vendorName);
}}

              >
                <option value="">Select Vendor</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>

              <input
                type="text"
                className="border p-2 rounded"
                placeholder="Invoice ID"
                value={line.invoiceId}
                onChange={(e) => updateLine(i, 'invoiceId', e.target.value)}
              />

              <input
                type="date"
                className="border p-2 rounded"
                value={line.date}
                onChange={(e) => updateLine(i, 'date', e.target.value)}
              />

              <input
                type="text"
                className="border p-2 rounded"
                placeholder="Amount"
                value={line.amount}
                onChange={(e) => updateLine(i, 'amount', e.target.value)}
              />

              <select
                className="border p-2 rounded"
                value={line.unit}
                onChange={(e) => updateLine(i, 'unit', e.target.value)}
              >
                <option value="">Select Unit</option>
                {unitOptions.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>

              <input
  type="number"
  className="border p-2 rounded"
  placeholder="Unit Size (e.g. 50, 128)"
  value={line.unitSize}
  onChange={(e) => updateLine(i, 'unitSize', e.target.value)}
/>
<p className="text-xs text-gray-500">
  Unit Size in: {getNormalizedUnit(line.unit?.toLowerCase()) || 'units'}
</p>



              <input
                type="text"
                className="border p-2 rounded"
                placeholder="Cost ($)"
                value={line.cost}
                onChange={(e) => updateLine(i, 'cost', e.target.value)}
              />

              <input
                type="text"
                className="border p-2 rounded"
                placeholder="Rate ($/unit)"
                value={line.rate}
                onChange={(e) => updateLine(i, 'rate', e.target.value)}
              />
            </div>

            <textarea
              className="border p-2 rounded w-full mt-4"
              placeholder="Notes (optional)"
              value={line.note}
              onChange={(e) => updateLine(i, 'note', e.target.value)}
            />
          </div>
        );
      })}

      <button onClick={addLine} className="bg-blue-600 text-white px-4 py-2 rounded mr-4">Add Another Line</button>
<button onClick={handleSubmit} className="bg-green-600 text-white px-4 py-2 rounded">
  {editId ? 'Update Purchase' : 'Save Purchases'}
</button>
    </div>
  );
}

export default LogProductPurchase;
