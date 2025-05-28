// ProductLedger.jsx — Full purchase ledger with grouping, filtering, edit/delete
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { useCropYear } from '../context/CropYearContext';
import LogInputsPurchase from '../components/LogInputsPurchase';

function ProductLedger() {
  const navigate = useNavigate();
  const { cropYear } = useCropYear();

  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [filter, setFilter] = useState({ vendor: '', product: '', invoice: '', search: '' });
  const [expanded, setExpanded] = useState({});
const [editModalOpen, setEditModalOpen] = useState(false);
const [editPurchase, setEditPurchase] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const [purchaseSnap, productSnap, vendorSnap] = await Promise.all([
        getDocs(collection(db, 'inputPurchases')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'vendors')),
      ]);

      const allPurchases = purchaseSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(p => String(p.cropYear) === String(cropYear));

      const allProducts = productSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const allVendors = vendorSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setPurchases(allPurchases);
      setProducts(allProducts);
      setVendors(allVendors);
    };
    loadData();
  }, [cropYear]);

  const getProduct = (id) => products.find(p => p.id === id) || {};
  const getVendorName = (id) => vendors.find(v => v.id === id)?.name || id;

  const getNormalizedAmount = (p, product) => {
    const amount = parseFloat(p.amount);
    const unitSize = parseFloat(p.unitSize);
    if (isNaN(amount) || isNaN(unitSize)) return null;
    return amount * unitSize;
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm('Delete this purchase?');
    if (!confirm) return;
    await deleteDoc(doc(db, 'inputPurchases', id));
    setPurchases(prev => prev.filter(p => p.id !== id));
  };

  const filtered = purchases.filter(p => {
    const product = getProduct(p.productId);
    return (
      (!filter.vendor || p.vendorId === filter.vendor) &&
      (!filter.product || p.productId === filter.product) &&
      (!filter.invoice || (p.invoiceId || '').includes(filter.invoice)) &&
      (!filter.search ||
        (product.name || '').toLowerCase().includes(filter.search.toLowerCase()) ||
        (p.invoiceId || '').toLowerCase().includes(filter.search.toLowerCase()))
    );
  });

  const grouped = filtered.reduce((acc, p) => {
    const product = getProduct(p.productId);
    const key = product.name || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const toggle = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Product Ledger – {cropYear}</h1>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <input
          placeholder="Search product or invoice"
          className="border p-2 rounded"
          value={filter.search}
          onChange={e => setFilter({ ...filter, search: e.target.value })}
        />
        <select
          className="border p-2 rounded"
          value={filter.vendor}
          onChange={e => setFilter({ ...filter, vendor: e.target.value })}
        >
          <option value="">All Vendors</option>
          {vendors.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
        <select
          className="border p-2 rounded"
          value={filter.product}
          onChange={e => setFilter({ ...filter, product: e.target.value })}
        >
          <option value="">All Products</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input
          placeholder="Invoice ID"
          className="border p-2 rounded"
          value={filter.invoice}
          onChange={e => setFilter({ ...filter, invoice: e.target.value })}
        />
      </div>

      {Object.entries(grouped).map(([key, list]) => (
        <div key={key} className="mb-6">
          <button
            className="bg-gray-100 w-full text-left px-4 py-2 rounded font-bold mb-1"
            onClick={() => toggle(key)}
          >
            {expanded[key] ? '▾' : '▸'} {key} ({list.length})
          </button>

          {expanded[key] && (
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1">Date</th>
                  <th className="border px-2 py-1">Product</th>
                  <th className="border px-2 py-1">Type</th>
                  <th className="border px-2 py-1">Vendor</th>
                  <th className="border px-2 py-1">Invoice</th>
                  <th className="border px-2 py-1 text-right">Amount</th>
                  <th className="border px-2 py-1">Unit</th>
                  <th className="border px-2 py-1 text-right">Normalized</th>
                  <th className="border px-2 py-1">Norm Unit</th>
                  <th className="border px-2 py-1 text-right">Cost</th>
                  <th className="border px-2 py-1 text-right">$/Unit</th>
                  <th className="border px-2 py-1">Note</th>
                  <th className="border px-2 py-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map(p => {
                  const product = getProduct(p.productId);
                  const norm = getNormalizedAmount(p, product);
                  return (
                    <tr key={p.id}>
                      <td className="border px-2 py-1">{p.date || "—"}</td>
                      <td className="border px-2 py-1">
                        {product.name || "—"}
                      </td>
                      <td className="border px-2 py-1">
                        {product.type || "—"}
                      </td>
                      <td className="border px-2 py-1">
                        {getVendorName(p.vendorId)}
                      </td>
                      <td className="border px-2 py-1">{p.invoice || "—"}</td>

                      <td className="border px-2 py-1 text-right">
                        {p.amount}
                      </td>
                      <td className="border px-2 py-1">{p.unit}</td>
                      <td className="border px-2 py-1 text-right">
                        {norm?.toFixed(2) || "—"}
                      </td>
                      <td className="border px-2 py-1">
                        {product.unit || "—"}
                      </td>
                      <td className="border px-2 py-1 text-right">
                        ${parseFloat(p.cost || 0).toFixed(2)}
                      </td>
                      <td className="border px-2 py-1 text-right">
                        {p.amount && p.cost
                          ? `$${(
                              parseFloat(p.cost) / parseFloat(p.amount)
                            ).toFixed(2)}`
                          : "—"}
                      </td>

                      <td className="border px-2 py-1">{p.note || ""}</td>
                      <td className="border px-2 py-1 text-center">
                        <button
                          onClick={() => {
                            setEditPurchase(p);
                            setEditModalOpen(true);
                          }}
                          className="text-blue-600 hover:underline text-sm mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}
      <LogInputsPurchase
  isOpen={editModalOpen}
  onClose={() => {
    setEditModalOpen(false);
    setEditPurchase(null);
  }}
  cropYear={cropYear}
  editPurchase={editPurchase}
/>

    </div>
  );
}

export default ProductLedger;
