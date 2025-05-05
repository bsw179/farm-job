import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

export default function VendorSummary() {
  const [purchases, setPurchases] = useState([]);
  const [groupedByVendor, setGroupedByVendor] = useState({});

  useEffect(() => {
    const fetchPurchases = async () => {
      const snap = await getDocs(collection(db, 'inputPurchases'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPurchases(data);
    };

    fetchPurchases();
  }, []);

  useEffect(() => {
    const grouped = {};

    purchases.forEach(p => {
      const vendor = p.vendorName || 'Unknown Vendor';
      if (!grouped[vendor]) grouped[vendor] = [];
      grouped[vendor].push(p);
    });

    setGroupedByVendor(grouped);
  }, [purchases]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Vendor Summary</h2>
      {/* 🔹 Vendor Totals Summary Card */}
<div className="bg-gray-100 border rounded p-4 mb-6 shadow-sm">
  <h4 className="text-lg font-semibold mb-2">2025 Vendor Totals</h4>
  <ul className="text-sm text-gray-800 space-y-1">
    {Object.entries(groupedByVendor).map(([vendor, entries]) => {
      const total = entries.reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0);
      return (
        <li key={vendor} className="flex justify-between">
          <span>{vendor}</span>
          <span className="font-mono">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </li>
      );
    })}
  </ul>
  <hr className="my-2" />
  <p className="text-sm font-medium flex justify-between">
    <span>Total Purchases</span>
    <span className="font-mono text-right">
      ${purchases.reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
    </span>
  </p>
</div>
 
     {Object.entries(groupedByVendor).map(([vendor, entries]) => {
  const groupedByProduct = {};
  entries.forEach(p => {
    const product = p.productName || 'Unknown Product';
    if (!groupedByProduct[product]) groupedByProduct[product] = [];
    groupedByProduct[product].push(p);
  });

  const vendorTotal = entries.reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0);

  return (
    <div key={vendor} className="mb-8 border rounded-lg p-4 shadow-sm bg-white">
      <h3 className="text-xl font-semibold mb-1">{vendor}</h3>
      <p className="text-sm text-gray-600 mb-4">
        Total Purchased: ${vendorTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </p>

      {Object.entries(groupedByProduct).map(([product, items]) => {
        const productTotal = items.reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0);
        const unit = items[0]?.unit || '';

        return (
          <div key={product} className="mb-6">
            <h4 className="font-semibold text-md mb-1">{product}</h4>

            {/* Table view */}
            <div className="hidden sm:block">
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 py-1 text-right">Amount</th>
                    <th className="border px-2 py-1 text-left">Unit</th>
                    <th className="border px-2 py-1 text-right">Cost</th>
                    <th className="border px-2 py-1 text-left">Date</th>
                    <th className="border px-2 py-1 text-left">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(p => (
                    <tr key={p.id}>
                      <td className="border px-2 py-1 text-right">{p.amount}</td>
                      <td className="border px-2 py-1">{p.unit}</td>
                      <td className="border px-2 py-1 text-right">${parseFloat(p.cost).toFixed(2)}</td>
                      <td className="border px-2 py-1">{p.date}</td>
                      <td className="border px-2 py-1">{p.invoice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {items.map(p => (
                <div key={p.id} className="border rounded-md p-3 bg-gray-50 shadow-sm">
                  <div className="text-sm">
                    {p.amount} {p.unit} • ${parseFloat(p.cost).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {p.date} • Invoice: {p.invoice}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-700 mt-1 font-medium">
              Total: {items.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toLocaleString()} {unit} • ${productTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        );
      })}
    </div>
  );
})}

    </div>
  );
}
