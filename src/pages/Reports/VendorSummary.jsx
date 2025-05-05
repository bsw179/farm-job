import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import ReportControls from '../../components/reports/ReportControls';
import { useContext } from 'react';
import { CropYearContext } from '../../context/CropYearContext';
import { saveAs } from 'file-saver';
import { generatePDFfromElement } from '../../utils/exportPDF';

export default function VendorSummary() {
  const [purchases, setPurchases] = useState([]);
  const [filterState, setFilterState] = useState({});
  const [sort, setSort] = useState('az');
  const [filters, setFilters] = useState({});

  const { cropYear } = useContext(CropYearContext);



useEffect(() => {
  const fetchPurchases = async () => {
    const snap = await getDocs(collection(db, 'inputPurchases'));
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const filteredByYear = data.filter(p => String(p.cropYear) === String(cropYear));
    setPurchases(filteredByYear);
  };

  fetchPurchases();
}, [cropYear]); // 👈 make sure this runs every time cropYear changes
  

  useEffect(() => {
    const grouped = {};

    purchases.forEach(p => {
      const vendor = p.vendorName || 'Unknown Vendor';
      if (!grouped[vendor]) grouped[vendor] = [];
      grouped[vendor].push(p);
    });

   
  }, [purchases]);

const filteredPurchases = purchases.filter(p => {
  const matchesOperator = !filterState.operator || (p.operator || '').toLowerCase() === filterState.operator.toLowerCase();
  const matchesVendor = !filterState.vendor || (p.vendorName || '').toLowerCase() === filterState.vendor.toLowerCase();
  const matchesProduct = !filterState.product || (p.productName || '').toLowerCase().includes(filterState.product.toLowerCase());

  let matchesDate = true;
  if (filterState.dateStart || filterState.dateEnd) {
    const jobDate = new Date(p.date);
    if (filterState.dateStart) matchesDate &= jobDate >= new Date(filterState.dateStart);
    if (filterState.dateEnd) matchesDate &= jobDate <= new Date(filterState.dateEnd);
  }

  return matchesOperator && matchesVendor && matchesProduct && matchesDate;
});

const sortedPurchases = [...filteredPurchases].sort((a, b) => {
  if (sort === 'az') return (a.vendorName || '').localeCompare(b.vendorName || '');
  if (sort === 'za') return (b.vendorName || '').localeCompare(a.vendorName || '');
  if (sort === 'newest') return new Date(b.date) - new Date(a.date);
  if (sort === 'oldest') return new Date(a.date) - new Date(b.date);
  return 0;
});

const groupedByVendor = {};
sortedPurchases.forEach(p => {
  const vendor = p.vendorName || 'Unknown Vendor';
  if (!groupedByVendor[vendor]) groupedByVendor[vendor] = [];
  groupedByVendor[vendor].push(p);
});

const handleExport = (format) => {
  if (format === 'csv') {
    let csv = 'Vendor,Product,Amount,Unit,Cost,Date,Invoice\n';

    Object.entries(groupedByVendor).forEach(([vendor, entries]) => {
      entries.forEach(p => {
        csv += [
          `"${vendor}"`,
          `"${p.productName || ''}"`,
          p.amount,
          p.unit,
          parseFloat(p.cost || 0).toFixed(2),
          p.date || '',
          p.invoice || ''
        ].join(',') + '\n';
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `VendorSummary_${cropYear}.csv`);
  }

  if (format === 'pdf') {
    const el = document.getElementById('report-container');
    generatePDFfromElement(el, `VendorSummary_${cropYear}.pdf`);
  }
};


  return (
   <div id="report-container" className="p-6 max-w-5xl mx-auto">

   <div className="no-print">
  <ReportControls
    title="Vendor Summary"
    sortOptions={[
      { label: 'Vendor A–Z', value: 'az' },
      { label: 'Vendor Z–A', value: 'za' },
      { label: 'Date Added (Newest)', value: 'newest' },
      { label: 'Date Added (Oldest)', value: 'oldest' }
    ]}
    filters={[
      { label: 'Operator', type: 'select', key: 'operator', options: ['PCF', 'TCF'] },
      { label: 'Vendor', type: 'select', key: 'vendor', options: Object.keys(groupedByVendor) },
      { label: 'Product', type: 'text', key: 'product' },
      { label: 'Date Range', type: 'date-range', key: 'date' }
    ]}
    onFilterChange={setFilterState}
    selectedSort={sort}
    onSortChange={setSort}
    onExport={handleExport}
  />
  {!filterState.operator && (
  <div className="text-sm text-gray-500 mb-2 ml-1">PCF <span className="mx-1">•</span> TCF</div>
)}

{filterState.operator && (
  <div className="text-sm text-gray-500 mb-2 ml-1">{filterState.operator}</div>
)}

</div>



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
    ${filteredPurchases.reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
