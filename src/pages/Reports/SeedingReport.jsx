
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

export default function SeedingReport() {
  const [jobs, setJobs] = useState([]);
  const [products, setProducts] = useState({});
  const [vendors, setVendors] = useState({});
  const [fields, setFields] = useState({});
  const [filterType, setFilterType] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [sortKey, setSortKey] = useState('Farm');

useEffect(() => {
  console.log('🚨 Jobs:', jobs);
}, [jobs]);


  useEffect(() => {
    const fetchData = async () => {
      const [vendorSnap, jobSnap, productSnap, fieldSnap] = await Promise.all([
        getDocs(collection(db, 'vendors')),
        getDocs(collection(db, 'jobs')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'fields')),
      ]);

      const vendorMap = {};
      vendorSnap.docs.forEach(doc => { vendorMap[doc.id] = doc.data(); });

      const productMap = {};
      productSnap.docs.forEach(doc => { productMap[doc.id] = doc.data(); });

      const fieldMap = {};
      fieldSnap.docs.forEach(doc => { fieldMap[doc.id] = doc.data(); });

      const seedJobs = jobSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(j => j.jobType === 'Seeding');

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
      return crop === 'Rice' ? totalRate / 900000
           : crop === 'Soybeans' ? totalRate / 140000
           : totalRate;
    } else if (unit.includes('lbs') || unit.includes('weight')) {
      return crop === 'Rice' ? totalRate / 45
           : crop === 'Soybeans' ? totalRate / 60
           : totalRate;
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

  const varietyKey = `${product.name}-${product.crop}`;
  const vendorName = job.vendor || '—';

  job.fields?.forEach(field => {
    const fieldData = fields[field.id];
    if (!fieldData) return;
    const acres = job.acres?.[field.id] || fieldData.gpsAcres || 0;
    const rate = jobProduct.rate || 0;
    const totalRate = rate * acres;
    const converted = convertTotalUnits(product, totalRate, jobProduct.unit);

    if (!varietySummary[varietyKey]) {
      varietySummary[varietyKey] = {
        variety: product.name,
        crop: product.crop,
        totalAcres: 0,
        totalUnits: 0,
        unitLabel: jobProduct.unit || '',
      };
    }
    varietySummary[varietyKey].totalAcres += acres;
    varietySummary[varietyKey].totalUnits += converted;

    if (!vendorSummary[vendorName]) vendorSummary[vendorName] = {};
    if (!vendorSummary[vendorName][varietyKey]) {
      vendorSummary[vendorName][varietyKey] = {
        variety: product.name,
        crop: product.crop,
        totalAcres: 0,
        totalUnits: 0,
      };
    }
    vendorSummary[vendorName][varietyKey].totalAcres += acres;
    vendorSummary[vendorName][varietyKey].totalUnits += converted;
  });
});


  const operatorSummary = Object.entries(
    jobs.reduce((acc, job) => {
      const jobProduct = job.products?.[0];
      const product = products[jobProduct?.productId];
      if (!product) return acc;

      job.fields?.forEach(field => {
        const fieldData = fields[field.id];
        if (!fieldData) return;

        const operator = fieldData.operator || '—';
        const acres = job.acres?.[field.id] || fieldData.gpsAcres || 0;
        const crop = product.crop || '—';
        const variety = product.name || '—';
        const key = `${operator}-${crop}-${variety}`;

        acc[key] = acc[key] || { operator, crop, variety, acres: 0 };
        acc[key].acres += acres;
      });

      return acc;
    }, {})
  ).reduce((grouped, [_, entry]) => {
    const { operator, ...rest } = entry;
    if (!grouped[operator]) grouped[operator] = [];
    grouped[operator].push(rest);
    return grouped;
  }, {});

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Filter and Sort Controls */}
      <div className="flex items-center gap-4 flex-wrap mb-4">
        <div>
          <label className="text-sm font-semibold mr-2">Filter by:</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border px-2 py-1 rounded">
            <option value="">None</option>
            <option value="Farm">Farm</option>
            <option value="Operator">Operator</option>
            <option value="Vendor">Vendor</option>
          </select>
        </div>
        {filterType && (
          <div>
            <select value={filterValue} onChange={e => setFilterValue(e.target.value)} className="border px-2 py-1 rounded">
              <option value="">All</option>
              {Array.from(new Set(jobs.flatMap(job => job.fields.map(f => {
                const fieldData = fields[f.id] || {};
                if (filterType === 'Farm') return fieldData.farmName;
                if (filterType === 'Operator') return fieldData.operator;
                if (filterType === 'Vendor') {
                  const jobProduct = job.products?.[0];
                  return vendors[jobProduct?.vendorId]?.name;
                }
                return null;
              })))).filter(Boolean).map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm font-semibold">Sort Fields by:</span>
          {['Farm', 'Vendor', 'Operator'].map(key => (
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
      <h1 className="text-2xl font-bold">🌱 Seeding Report - 2025</h1>

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
              {jobs.flatMap(job => {
                const jobProduct = job.products?.[0];
                const product = products[jobProduct?.productId] || {};
                const rate = jobProduct?.rate || '';
                const unit = jobProduct?.unit || '';
const vendorName = job.vendor || '—';

                return job.fields.map(field => {
                  const fieldData = fields[field.id] || {};
                  const acres = job.acres?.[field.id] || fieldData.gpsAcres || 0;
                  return (
                    <tr key={`${job.id}-${field.id}`}>
                      <td className="border px-2 py-1">{fieldData.farmName || '—'}</td>
                      <td className="border px-2 py-1">{fieldData.fieldName || '—'}</td>
                      <td className="border px-2 py-1 text-right">{acres}</td>
                      <td className="border px-2 py-1">{product.crop || '—'}</td>
                      <td className="border px-2 py-1">{fieldData.operator || '—'}</td>
                      <td className="border px-2 py-1">{product.name || '—'}</td>
                      <td className="border px-2 py-1">{rate} {unit}</td>
                      <td className="border px-2 py-1">{vendorName}</td>
                    </tr>
                  );
                });
              })}
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
              <th className="border px-2 py-1">Total Acres</th>
              <th className="border px-2 py-1">Total Units & Bushels</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(varietySummary).map(row => (
              <tr key={`${row.variety}-${row.crop}`}>
                <td className="border px-2 py-1">{row.variety}</td>
                <td className="border px-2 py-1">{row.crop}</td>
                <td className="border px-2 py-1 text-right">{row.totalAcres.toFixed(1)}</td>
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
                  <th className="border px-2 py-1">Total Acres</th>
                  <th className="border px-2 py-1">Total Units</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(varieties).map(row => (
                  <tr key={`${row.variety}-${row.crop}`}>
                    <td className="border px-2 py-1">{row.variety}</td>
                    <td className="border px-2 py-1">{row.crop}</td>
                    <td className="border px-2 py-1 text-right">{row.totalAcres.toFixed(1)}</td>
                    <td className="border px-2 py-1 text-right">{row.totalUnits.toFixed(1)}</td>
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
