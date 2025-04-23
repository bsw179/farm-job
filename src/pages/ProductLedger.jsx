// src/pages/ProductLedger.jsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useCropYear } from '../context/CropYearContext';
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

export default function ProductLedger() {
  // 🔹 State
  const { cropYear } = useCropYear();
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState({});
  // 🔹 Filter State
const [filterProduct, setFilterProduct] = useState('');
const [filterVendor, setFilterVendor] = useState('');
const [filterInvoice, setFilterInvoice] = useState('');

  // 🔹 Fetch purchases & products
  useEffect(() => {
    const fetchData = async () => {
      const [purchaseSnap, productSnap] = await Promise.all([
        getDocs(collection(db, 'inputPurchases')),
        getDocs(collection(db, 'products')),
      ]);

      const productMap = {};
      productSnap.docs.forEach(doc => {
        productMap[doc.id] = doc.data();
      });

      const filtered = purchaseSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => p.cropYear === cropYear);

      setProducts(productMap);
      setPurchases(filtered);
    };

    fetchData();
  }, [cropYear]);

  // 🔹 Render: Purchase Ledger Table
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">📒 Product Purchase Ledger – {cropYear}</h1>
{/* 🔹 Filter Controls */}
<div className="flex flex-wrap items-center gap-4 text-sm">
  <div>
    <label className="block font-medium mb-1">Product</label>
    <select
      value={filterProduct}
      onChange={(e) => setFilterProduct(e.target.value)}
      className="border rounded px-2 py-1"
    >
      <option value="">All</option>
      {Object.entries(products).map(([id, p]) => (
        <option key={id} value={id}>{p.name}</option>
      ))}
    </select>
  </div>

  <div>
    <label className="block font-medium mb-1">Vendor</label>
    <select
      value={filterVendor}
      onChange={(e) => setFilterVendor(e.target.value)}
      className="border rounded px-2 py-1"
    >
      <option value="">All</option>
      {[...new Set(purchases.map(p => p.vendor).filter(Boolean))].sort().map(v => (
        <option key={v} value={v}>{v}</option>
      ))}
    </select>
  </div>

  <div>
    <label className="block font-medium mb-1">Invoice ID</label>
    <input
      value={filterInvoice}
      onChange={(e) => setFilterInvoice(e.target.value)}
      className="border rounded px-2 py-1"
      placeholder="INV-####"
    />
  </div>
</div>

      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">Date</th>
            <th className="border px-2 py-1">Product</th>
            <th className="border px-2 py-1">Type</th>
            <th className="border px-2 py-1">Vendor</th>
            <th className="border px-2 py-1 text-right">Amount</th>
            <th className="border px-2 py-1">Unit</th>
            <th className="border px-2 py-1 text-right">Normalized</th>
            <th className="border px-2 py-1">Norm Unit</th>
            <th className="border px-2 py-1 text-right">Cost</th>
            <th className="border px-2 py-1 text-right">Rate</th>
            <th className="border px-2 py-1">Invoice</th>
            <th className="border px-2 py-1">Note</th>
          </tr>
        </thead>
        <tbody>
          {purchases
  .filter(p => !filterProduct || p.productId === filterProduct)
  .filter(p => !filterVendor || p.vendor === filterVendor)
  .filter(p => !filterInvoice || (p.invoiceId || '').toLowerCase().includes(filterInvoice.toLowerCase()))
  .map((p, i) => {

            const prod = products[p.productId] || {};
            return (
              <tr key={p.id}>
                <td className="border px-2 py-1">{p.date?.toDate?.().toLocaleDateString?.() || '—'}</td>
                <td className="border px-2 py-1">{prod.name || '—'}</td>
                <td className="border px-2 py-1">{prod.type || '—'}</td>
                <td className="border px-2 py-1">{p.vendor || '—'}</td>
                <td className="border px-2 py-1 text-right">{p.amount}</td>
                <td className="border px-2 py-1">{p.unit}</td>
                <td className="border px-2 py-1 text-right">
  {p.normalizedAmount?.toLocaleString()} {getDisplayUnitLabel(prod)}
  <span className="text-gray-500 text-xs ml-1">
    ({getInvoiceEquivalent(prod, p.normalizedAmount)})
  </span>
</td>

                <td className="border px-2 py-1 text-right">{p.cost ? `$${p.cost.toFixed(2)}` : '—'}</td>
                <td className="border px-2 py-1 text-right">{p.rate ? `$${p.rate.toFixed(2)}` : '—'}</td>
                <td className="border px-2 py-1">{p.invoiceId || '—'}</td>
                <td className="border px-2 py-1">{p.note || '—'}</td>
                <td className="border px-2 py-1 text-right whitespace-nowrap">
  <button
    onClick={() => {
      window.location.href = `/financial/log?id=${p.id}`;
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
