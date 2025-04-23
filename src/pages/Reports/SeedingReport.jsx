// FULL UPDATED SeedingReport.jsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
export default function SeedingReport() {
  const [jobs, setJobs] = useState([]);
  const [products, setProducts] = useState({});
  const [vendors, setVendors] = useState({});
  const [fields, setFields] = useState({});
  const [filterType, setFilterType] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [sortKey, setSortKey] = useState('Farm');
const [exportSections, setExportSections] = useState({
  fieldDetails: true,
  operatorSummary: false,
  varietySummary: false,
  vendorSummary: false,
});
const [selectedVendors, setSelectedVendors] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const [vendorSnap, jobSnap, productSnap, fieldSnap] = await Promise.all([
        getDocs(collection(db, 'vendors')),
        getDocs(collection(db, 'jobsByField')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'fields')),
    
      ]);
    

      const getFieldValue = (fieldId, key) => fields?.[fieldId]?.[key] || '—';

      const vendorMap = {};
      vendorSnap.docs.forEach(doc => { vendorMap[doc.id] = doc.data(); });

      const productMap = {};
      productSnap.docs.forEach(doc => { productMap[doc.id] = doc.data(); });

      const fieldMap = {};
      fieldSnap.docs.forEach(doc => { fieldMap[doc.id] = doc.data(); });

     const seedJobs = jobSnap.docs
  .map(doc => ({ id: doc.id, ...doc.data() }))
  .filter(j => j.jobType?.parentName === 'Seeding');


      setJobs(seedJobs);
      setProducts(productMap);
      setVendors(vendorMap);
      setFields(fieldMap);
    };

    fetchData();
  }, []);

  const convertTotalUnits = (product, totalRate, unit) => {
    if (!product || !unit) return totalRate;
    const crop = product.crop;
    if (unit.includes('seeds') || unit.includes('population')) {
      return crop === 'Rice' ? totalRate / 900000 : crop === 'Soybeans' ? totalRate / 140000 : totalRate;
    } else if (unit.includes('lbs') || unit.includes('weight')) {
      return crop === 'Rice' ? totalRate / 45 : crop === 'Soybeans' ? totalRate / 60 : totalRate;
    } else {
      return totalRate;
    }
  };

  const varietySummary = {};
  const vendorSummary = {};

 jobs.forEach(job => {
  const jobProduct = job.products?.[0];
  if (!jobProduct) return;

  const product = products[jobProduct.productId];
  if (!product) return;

  const fieldData = fields[job.fieldId];
  if (!fieldData) return;

  const crop = fieldData.crops?.[2025]?.crop || fieldData.crop || '';
  const jobName = job.jobType?.name?.toLowerCase() || '';
  const isLeveeJob = jobName.includes('levee') || jobName.includes('pack');
  const varietyKey = `${product.name}-${product.crop}`;
  const vendorName = job.vendor || '—';

  const acres = (() => {
    if (isLeveeJob) {
      if (crop.includes('Rice')) return parseFloat(fieldData.riceLeveeAcres) || 0;
      if (crop.includes('Soybean')) return parseFloat(fieldData.beanLeveeAcres) || 0;
    }
    return job.acres || fieldData.gpsAcres || 0;
  })();

  const rate = jobProduct.rate || 0;
  const totalRate = rate * acres;
  const converted = convertTotalUnits(product, totalRate, jobProduct.unit);
  const unitType = jobProduct.unit.includes('seeds')
    ? 'units'
    : jobProduct.unit.includes('lbs')
      ? 'bushels'
      : 'units';

  if (!varietySummary[varietyKey]) {
    varietySummary[varietyKey] = {
      variety: product.name,
      crop: product.crop,
      fieldAcres: 0,
      leveeAcres: 0,
      totalAcres: 0,
      totalUnits: 0,
      unitLabel: unitType,
    };
  } else {
    if (!varietySummary[varietyKey].unitLabel) {
      varietySummary[varietyKey].unitLabel = unitType;
    }
  }

  if (isLeveeJob) {
    varietySummary[varietyKey].leveeAcres += parseFloat(acres) || 0;
  } else {
    varietySummary[varietyKey].fieldAcres += parseFloat(acres) || 0;
  }

  varietySummary[varietyKey].totalAcres =
    varietySummary[varietyKey].fieldAcres + varietySummary[varietyKey].leveeAcres;

  varietySummary[varietyKey].totalUnits += converted;

  // vendor summary (if you're doing it here too)
  if (!vendorSummary[vendorName]) vendorSummary[vendorName] = {};
  if (!vendorSummary[vendorName][varietyKey]) {
    vendorSummary[vendorName][varietyKey] = {
      variety: product.name,
      crop: product.crop,
      fieldAcres: 0,
      leveeAcres: 0,
      totalAcres: 0,
      totalUnits: 0,
      unitLabel: unitType,
      expenseSplit: {},
    };
  }

  if (isLeveeJob) {
    vendorSummary[vendorName][varietyKey].leveeAcres += parseFloat(acres) || 0;
  } else {
    vendorSummary[vendorName][varietyKey].fieldAcres += parseFloat(acres) || 0;
  }

  vendorSummary[vendorName][varietyKey].totalAcres =
    vendorSummary[vendorName][varietyKey].fieldAcres +
    vendorSummary[vendorName][varietyKey].leveeAcres;

  vendorSummary[vendorName][varietyKey].totalUnits += converted;

  const operatorName = fieldData.operator || '—';
  const landownerName = fieldData.landowner || '—';
  const operatorShare = fieldData.operatorExpenseShare ?? 0;
  const landownerShare = fieldData.landownerExpenseShare ?? 0;

  if (operatorShare > 0) {
    vendorSummary[vendorName][varietyKey].expenseSplit[operatorName] =
      (vendorSummary[vendorName][varietyKey].expenseSplit[operatorName] || 0) +
      converted * (operatorShare / 100);
  }

  if (landownerShare > 0) {
    vendorSummary[vendorName][varietyKey].expenseSplit[landownerName] =
      (vendorSummary[vendorName][varietyKey].expenseSplit[landownerName] || 0) +
      converted * (landownerShare / 100);
  }
});


  const handleExportCSV = () => {
  const header = ['Farm', 'Field', 'Acres', 'Crop', 'Operator', 'Variety', 'Rate', 'Vendor'];
  const rows = sortedFieldRows.map(row => [
    row.farm,
    row.field,
    row.acres,
    row.crop,
    row.operator,
    row.variety,
    row.rate,
    row.vendor,
  ]);

  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'field-details.csv';
  link.click();
};

const handleExportPDF = () => {
  const doc = new jsPDF();
  let startY = 10;

  if (exportSections.fieldDetails) {
    autoTable(doc, {
      head: [['Farm', 'Field', 'Acres', 'Crop', 'Operator', 'Variety', 'Rate', 'Vendor']],
      body: sortedFieldRows.map(row => [
        row.farm,
        row.field,
        row.acres,
        row.crop,
        row.operator,
        row.variety,
        row.rate,
        row.vendor,
      ]),
      startY,
      theme: 'grid',
      styles: { fontSize: 8 },
      didDrawPage: (data) => {
        doc.setFontSize(12);
        doc.text("Field Details", data.settings.margin.left, startY - 2);
      }
    });
    startY = doc.lastAutoTable.finalY + 10;
  }

  if (exportSections.operatorSummary) {
    autoTable(doc, {
      head: [['Operator', 'Crop', 'Variety', 'Acres']],
      body: Object.entries(operatorSummary).flatMap(([operator, rows]) =>
        rows.map(r => [operator, r.crop, r.variety, r.acres.toFixed(1)])
      ),
      startY,
      theme: 'grid',
      styles: { fontSize: 8 },
      didDrawPage: (data) => {
        doc.setFontSize(12);
        doc.text("Operator Summary", data.settings.margin.left, startY - 2);
      }
    });
    startY = doc.lastAutoTable.finalY + 10;
  }

  if (exportSections.varietySummary) {
    autoTable(doc, {
      head: [['Variety', 'Crop', 'Total Acres', 'Total Units']],
      body: Object.values(varietySummary).map(r => [
        r.variety, r.crop, r.totalAcres.toFixed(1), `${r.totalUnits.toFixed(1)} ${r.unitLabel}`
      ]),
      startY,
      theme: 'grid',
      styles: { fontSize: 8 },
      didDrawPage: (data) => {
        doc.setFontSize(12);
        doc.text("Variety Summary", data.settings.margin.left, startY - 2);
      }
    });
    startY = doc.lastAutoTable.finalY + 10;
  }

  if (exportSections.vendorSummary) {
Object.entries(vendorSummary)
  .filter(([vendorName]) =>
    selectedVendors.length === 0 || selectedVendors.includes(vendorName)
  )
  .forEach(([vendorName, entries]) => {
    // rest stays the same

    autoTable(doc, {
      head: [['Variety', 'Crop', 'Total Acres', 'Total Units', 'Expense Split']],
      body: Object.values(entries).map(r => [
        r.variety,
        r.crop,
        r.totalAcres.toFixed(1),
        `${r.totalUnits.toFixed(1)} ${r.unitLabel}`,
        Object.entries(r.expenseSplit).map(([name, val]) =>
          `${name} - ${val.toFixed(1)} ${r.unitLabel}`
        ).join(', ')
      ]),
      startY,
      theme: 'grid',
      styles: { fontSize: 8 },
      didDrawPage: (data) => {
        doc.setFontSize(12);
        doc.text(`Vendor: ${vendorName}`, data.settings.margin.left, startY - 2);
      }
    });
    startY = doc.lastAutoTable.finalY + 10;
  });
}



  doc.save('seeding-report.pdf');
};




  const operatorSummary = Object.entries(
  jobs.reduce((acc, job) => {
    const jobProduct = job.products?.[0];
    const product = products[jobProduct?.productId];
    if (!product) return acc;

    const fieldData = fields[job.fieldId];
    if (!fieldData) return acc;

    const operator = fieldData.operator || '—';
    const crop = product.crop || '—';
    const variety = product.name || '—';

    const jobName = job.jobType?.name?.toLowerCase() || '';
    const cropName = fieldData.crops?.[2025]?.crop?.toLowerCase?.() || fieldData.crop?.toLowerCase?.() || '';

    const acres = (() => {
      if (jobName.includes('levee') || jobName.includes('pack')) {
        if (cropName.includes('rice')) return parseFloat(fieldData.riceLeveeAcres) || 0;
        if (cropName.includes('soybean')) return parseFloat(fieldData.beanLeveeAcres) || 0;
        return 0;
      }
      return job.acres || fieldData.gpsAcres || 0;
    })();

    const key = `${operator}-${crop}-${variety}`;
    acc[key] = acc[key] || { operator, crop, variety, acres: 0 };
    acc[key].acres += acres;

    return acc;
  }, {})
).reduce((grouped, [_, entry]) => {
  const { operator, ...rest } = entry;
  if (!grouped[operator]) grouped[operator] = [];
  grouped[operator].push(rest);
  return grouped;
}, {});



const filteredJobs = jobs.filter(job => {
  if (!filterType || !filterValue) return true;

  const fieldData = fields[job.fieldId];
  if (!fieldData) return false;

  if (filterType === 'Farm') return fieldData.farmName === filterValue;
  if (filterType === 'Operator') return fieldData.operator === filterValue;
  if (filterType === 'Vendor') return job.vendor === filterValue;

  return true;
});

const sortedFieldRows = filteredJobs.flatMap(job => {
  const jobProduct = job.products?.[0];
  const product = products[jobProduct?.productId] || {};
  const rate = jobProduct?.rate || '';
  const unit = jobProduct?.unit || '';
  const vendorName = job.vendor || '—';

  const fieldData = fields[job.fieldId] || {};
return [{
  farm: fieldData.farmName || '—',
  field: fieldData.fieldName || '—',
  acres: (() => {
    const crop = fieldData.crops?.[2025]?.crop?.toLowerCase?.() || fieldData.crop?.toLowerCase?.() || '';
    const jobName = job.jobType?.name?.toLowerCase() || '';
    if (jobName.includes('levee') || jobName.includes('pack')) {
      if (crop.includes('rice')) return parseFloat(fieldData.riceLeveeAcres) || 0;
      if (crop.includes('soybean')) return parseFloat(fieldData.beanLeveeAcres) || 0;
      return 0;
    }
    return job.acres || fieldData.gpsAcres || 0;
  })(),
  crop: products[job.products?.[0]?.productId]?.crop || '—',
  operator: fieldData.operator || '—',
  variety: (() => {
    const name = products[job.products?.[0]?.productId]?.name || '—';
    const jobName = job.jobType?.name?.toLowerCase() || '';
    return jobName.includes('levee') || jobName.includes('pack') ? `${name} (Levee Seeding)` : name;
  })(),
  rate: `${job.products?.[0]?.rate || ''} ${job.products?.[0]?.unit || ''}`,
  vendor: job.vendor || '—'
}];

}).sort((a, b) => {
if (sortKey === 'Farm') {
  return a.farm === b.farm
    ? a.field.localeCompare(b.field)
    : a.farm.localeCompare(b.farm);
}
  if (sortKey === 'Field') return a.field.localeCompare(b.field);
  if (sortKey === 'Acres') return a.acres - b.acres;
  if (sortKey === 'Crop') return a.crop.localeCompare(b.crop);
  if (sortKey === 'Operator') return a.operator.localeCompare(b.operator);
  if (sortKey === 'Variety') return a.variety.localeCompare(b.variety);
  if (sortKey === 'Vendor') return a.vendor.localeCompare(b.vendor);
  return 0;
});


   

   return (
  <div className="p-6 space-y-8 max-w-7xl mx-auto">
    <h1 className="text-2xl font-bold">🌱 Seeding Report - 2025</h1>
   <div className="flex items-center gap-2 mb-4">
  <label className="text-sm font-semibold">Filter by:</label>
  <select
    value={filterType}
    onChange={e => {
      setFilterType(e.target.value);
      setFilterValue('');
    }}
    className="border px-2 py-1 rounded"
  >
    <option value="">None</option>
    <option value="Farm">Farm</option>
    <option value="Operator">Operator</option>
  </select>

  {filterType && (
    <select
      value={filterValue}
      onChange={e => setFilterValue(e.target.value)}
      className="border px-2 py-1 rounded"
    >
      <option value="">All</option>
      {Array.from(new Set(
        Object.values(fields)
          .map(f => {
            if (filterType === 'Farm') return f.farmName;
            if (filterType === 'Operator') return f.operator;
            return null;
          })
      ))
        .filter(Boolean)
        .sort()
        .map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
    </select>
  )}
</div>

    <div className="flex items-center gap-4 flex-wrap mb-4">
     {/* Sort Buttons on the Left */}
<div className="space-y-2 mb-4">
  {/* Row 1 */}
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-sm font-semibold mr-2">Sort Fields by:</span>
    {['Farm', 'Field', 'Acres', 'Crop'].map(key => (
      <button
        key={key}
        onClick={() => setSortKey(key)}
        className={`px-3 py-1 rounded border ${sortKey === key ? 'bg-blue-600 text-white' : 'bg-white'}`}
      >
        {key}
      </button>
    ))}
  </div>

  {/* Row 2 */}
  <div className="flex items-center gap-2 flex-wrap">
    {['Operator', 'Variety', 'Vendor'].map(key => (
      <button
        key={key}
        onClick={() => setSortKey(key)}
        className={`px-3 py-1 rounded border ${sortKey === key ? 'bg-blue-600 text-white' : 'bg-white'}`}
      >
        {key}
      </button>
    ))}
  </div>
</div>


      

     
    </div>

    

<div className="flex justify-start gap-2 mb-4">
  <button onClick={handleExportPDF} className="px-3 py-1 border rounded bg-white">Export PDF</button>
  <button onClick={handleExportCSV} className="px-3 py-1 border rounded bg-white">Export CSV</button>
</div>


<div className="flex flex-wrap items-center gap-2 mb-4">
  <span className="text-sm font-semibold mr-2">Include in Export:</span>
  {[
    { key: 'fieldDetails', label: 'Field Details' },
    { key: 'operatorSummary', label: 'Operator Summary' },
    { key: 'varietySummary', label: 'Variety Summary' },
    { key: 'vendorSummary', label: 'Vendor Summary' },
  ].map(section => (
    <button
      key={section.key}
      onClick={() =>
        setExportSections(prev => ({
          ...prev,
          [section.key]: !prev[section.key],
        }))
      }
      className={`px-3 py-1 rounded-full text-sm border transition ${
        exportSections[section.key]
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
      }`}
    >
      {section.label}
    </button>
  ))}
</div>

{/* Vendor Filter Buttons */}
{Object.keys(vendorSummary).length > 0 && (
  <div className="flex flex-wrap gap-2 mt-2">
    {Object.keys(vendorSummary).sort().map(vendor => (
      <button
        key={vendor}
        onClick={() => {
  if (!exportSections.vendorSummary) return;
  setSelectedVendors(prev =>
    prev.includes(vendor)
      ? prev.filter(v => v !== vendor) // remove
      : [...prev, vendor]              // add
  );
}}

        className={`px-3 py-1 rounded-full text-sm border transition
          ${
            exportSections.vendorSummary
              ? selectedVendors.includes(vendor)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              : 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'
          }`}
        disabled={!exportSections.vendorSummary}
      >
        {vendor}
      </button>
    ))}
  </div>
)}

      {/* Field Details */}
      <section>
        <h2 className="text-xl font-semibold">Field Details</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-sm border">
   <thead className="bg-gray-100">
  <tr>
    <th className="border px-2 py-1">Farm</th>
    <th className="border px-2 py-1">Field</th>
    <th className="border px-2 py-1">Acres</th>
    <th className="border px-2 py-1">Crop</th>
    <th className="border px-2 py-1">Operator</th>
    <th className="border px-2 py-1">Variety</th>
    <th className="border px-2 py-1">Rate</th>
    <th className="border px-2 py-1">Vendor</th>
  </tr>
</thead>
      <tbody>
  {sortedFieldRows.map(row => (
    <tr key={`${row.farm}-${row.field}`}>
      <td className="border px-2 py-1">{row.farm}</td>
      <td className="border px-2 py-1">{row.field}</td>
      <td className="border px-2 py-1 text-right">{row.acres}</td>
      <td className="border px-2 py-1">{row.crop}</td>
      <td className="border px-2 py-1">{row.operator}</td>
      <td className="border px-2 py-1">{row.variety}</td>
      <td className="border px-2 py-1">{row.rate}</td>
      <td className="border px-2 py-1">{row.vendor}</td>
    </tr>
  ))}
</tbody>

          </table>
        </div>
      </section>

      {/* Operator Summary */}
      <section>
        <h2 className="text-xl font-semibold">Operator Summaries</h2>
        {Object.entries(operatorSummary).map(([operator, rows]) => {
          const totalAcres = rows.reduce((sum, r) => sum + r.acres, 0);
          return (
            <div key={operator} className="mt-4">
              <h3 className="font-bold">{operator} – {totalAcres.toFixed(1)} acres</h3>
              <table className="min-w-full text-sm border mt-2">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 py-1">Crop</th>
                    <th className="border px-2 py-1">Variety</th>
                    <th className="border px-2 py-1">Acres</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={`${row.crop}-${row.variety}`}>
                      <td className="border px-2 py-1">{row.crop}</td>
                      <td className="border px-2 py-1">{row.variety}</td>
                      <td className="border px-2 py-1 text-right">{row.acres.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </section>

      {/* Variety Summary */}
      <section>
        <h2 className="text-xl font-semibold">Variety Summary</h2>
        <table className="min-w-full text-sm border mt-2">
    <thead className="bg-gray-100">
  <tr>
    <th className="border px-2 py-1">Variety</th>
    <th className="border px-2 py-1">Crop</th>
    <th className="border px-2 py-1">Field Acres</th>
    <th className="border px-2 py-1">Levee Acres</th>
    <th className="border px-2 py-1">Total Acres</th>
    <th className="border px-2 py-1">Total</th>
  </tr>
</thead>


          <tbody>
  {Object.values(varietySummary).map(row => (
  <tr key={`${row.variety}-${row.crop}`}>
    <td className="border px-2 py-1">{row.variety}</td>
    <td className="border px-2 py-1">{row.crop}</td>
    <td className="border px-2 py-1 text-right">{parseFloat(row.fieldAcres || 0).toFixed(1)}</td>
    <td className="border px-2 py-1 text-right">
  {row.crop === 'Rice' && row.leveeAcres > 0
    ? parseFloat(row.leveeAcres).toFixed(1)
    : '—'}
</td>

    <td className="border px-2 py-1 text-right">{parseFloat(row.totalAcres || 0).toFixed(1)}</td>
    <td className="border px-2 py-1 text-right">{row.totalUnits.toFixed(1)} {row.unitLabel}</td>
  </tr>
))}


            
          </tbody>
        </table>
      </section>

      {/* Vendor Summary */}
      <section>
        <h2 className="text-xl font-semibold">Vendor Summary</h2>
        {Object.entries(vendorSummary).map(([vendorName, varieties]) => (
          <div key={vendorName} className="mt-4">
            <h3 className="font-bold">Vendor: {vendorName}</h3>
            <table className="min-w-full text-sm border mt-2">
              <thead className="bg-gray-100">
  <tr>
    <th className="border px-2 py-1">Variety</th>
    <th className="border px-2 py-1">Crop</th>
    <th className="border px-2 py-1">Field Acres</th>
    <th className="border px-2 py-1">Levee Acres</th>
    <th className="border px-2 py-1">Total Acres</th>
    <th className="border px-2 py-1">Total</th>
    <th className="border px-2 py-1">Expense Split</th>
  </tr>
</thead>

            <tbody>
  {Object.values(varieties).map(row => (
    <tr key={`${row.variety}-${row.crop}`}>
      <td className="border px-2 py-1">{row.variety}</td>
      <td className="border px-2 py-1">{row.crop}</td>
      <td className="border px-2 py-1 text-right">{parseFloat(row.fieldAcres || 0).toFixed(1)}</td>
      <td className="border px-2 py-1 text-right">
  {row.crop === 'Rice' && row.leveeAcres > 0
    ? parseFloat(row.leveeAcres).toFixed(1)
    : '—'}
</td>

      <td className="border px-2 py-1 text-right">{parseFloat(row.totalAcres || 0).toFixed(1)}</td>
      <td className="border px-2 py-1 text-right">{row.totalUnits.toFixed(1)} {row.unitLabel}</td>
      <td className="border px-2 py-1">
       {Object.entries(row.expenseSplit).map(([name, val]) => (
  <div key={name}>{name} - {val.toFixed(1)} {row.unitLabel}</div>
))}

      </td>
    </tr>
  ))}
</tbody>

            </table>
          </div>
        ))}
      </section>
  </div>
);
}
