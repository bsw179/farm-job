import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';

function ProductSummaryModal({ productId, isOpen, onClose }) {
  const [jobs, setJobs] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [product, setProduct] = useState(null);

  useEffect(() => {
    if (!isOpen || !productId) return;

    const load = async () => {
      const jobSnap = await getDocs(collection(db, 'jobsByField'));
      const purchaseSnap = await getDocs(collection(db, 'inputPurchases'));
      const productSnap = await getDocs(collection(db, 'products'));

      setJobs(jobSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPurchases(purchaseSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setProduct(productSnap.docs.map(d => ({ id: d.id, ...d.data() })).find(p => p.id === productId));
    };
    load();
  }, [isOpen, productId]);
const getNormalizedUnit = (purchaseUnit, productType) => {
  const u = purchaseUnit?.toLowerCase();

  if (productType === "Seed" && u === "units") {
    return "lbs"; // seed by weight — still normalized to lbs
  }

  if (productType === "Seed" && u === "seeds") {
    return "seeds"; // for population tracking, true seed count
  }

  if (["gal", "qt", "pt"].includes(u)) return "fl oz";
  if (u === "tons") return "lbs";
  if (u === "oz") return productType === "Chemical" ? "oz" : "lbs";
  return u;
};

  if (!isOpen || !product) return null;

  const jobUsage = jobs.flatMap(job => {
  return (job.products || []).filter(p => p.productId === productId).map(p => {
    const rate = parseFloat(p.rate || 0);
    const acres = parseFloat(job.acres || 0);
    const applied = rate * acres;
    const unit = (p.unit || '').split('/')[0];
    return {
      field: job.fieldName || job.fieldId,
      operator: job.operator || '',
      date: job.jobDate || '',
      rate,
      acres,
      applied,
      unit,
      crop: job.crop || '',
      jobType: job.jobType?.name || '',
      operatorShare: job.operatorExpenseShare || 0,
      landowner: job.landowner || '',
      landownerShare: job.landownerExpenseShare || 0,
      jobId: job.id
    };
  });
}).sort((a, b) => new Date(b.date) - new Date(a.date));


  const productPurchases = purchases.filter(p => p.productId === productId);
  const totalCost = productPurchases.reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0);
  const totalNormalized = productPurchases.reduce((sum, p) => sum + ((parseFloat(p.amount) || 0) * (parseFloat(p.unitSize) || 1)), 0);
  const avgUnitPrice = totalNormalized > 0 ? totalCost / totalNormalized : 0;

  const operatorApplied = {};
  const landownerApplied = {};

  jobUsage.forEach(u => {
    if (u.operatorShare > 0) {
      operatorApplied[u.operator] = (operatorApplied[u.operator] || 0) + u.applied * (u.operatorShare / 100);
    }
    if (u.landownerShare > 0) {
      landownerApplied[u.landowner] = (landownerApplied[u.landowner] || 0) + u.applied * (u.landownerShare / 100);
    }
  });
const operatorPurchaseTotals = {};
productPurchases.forEach(p => {
  const operator = p.operator || 'Unknown';
  const amount = parseFloat(p.normalizedAmount || 0);
  const cost = parseFloat(p.cost || 0);
  const unitSize = parseFloat(p.unitSize || 1);

  if (!operatorPurchaseTotals[operator]) {
    operatorPurchaseTotals[operator] = { amount: 0, cost: 0, units: 0 };
  }

  operatorPurchaseTotals[operator].amount += amount;
  operatorPurchaseTotals[operator].cost += cost;
  operatorPurchaseTotals[operator].units += amount / unitSize;
});

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {product.name} ({product.type})
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✕
          </button>
        </div>

        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
          <div className="border rounded p-3 bg-gray-50">
            <div className="font-semibold">Total Purchased:</div>
            <div>
              {totalNormalized.toLocaleString()}{" "}
              {getNormalizedUnit(productPurchases[0]?.unit, product?.type)}( (
              {productPurchases
                .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
                .toLocaleString()}{" "}
              {productPurchases[0]?.unit})
            </div>

            {Object.entries(operatorPurchaseTotals).map(([name, val]) => {
              const purchaseUnit = productPurchases[0]?.unit || "";
              const unitSize = parseFloat(productPurchases[0]?.unitSize || 1);
              const normalizedUnit = getNormalizedUnit(
                purchaseUnit,
                product?.type
              );

              const isSeedByWeight =
                product?.type === "Seed" &&
                unitSize > 1 &&
                purchaseUnit !== normalizedUnit;

              const purchaseDisplayLabel = isSeedByWeight
                ? "units"
                : purchaseUnit;

              return (
                <div key={name} className="text-xs text-gray-600">
                  {name}:{" "}
                  {val.amount.toLocaleString(undefined, {
                    maximumFractionDigits: 1,
                  })}{" "}
                  {normalizedUnit} ({(val.amount / unitSize).toFixed(1)}{" "}
                  {purchaseDisplayLabel})
                </div>
              );
            })}
          </div>

          <div className="border rounded p-3 bg-gray-50">
            <div className="font-semibold">Total Cost:</div>
            <div>
              $
              {totalCost.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
            {Object.entries(operatorPurchaseTotals).map(([name, val]) => (
              <div key={name} className="text-xs text-gray-600">
                {name}: $
                {val.cost.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
            ))}
          </div>

          <div className="border rounded p-3 bg-gray-50">
            <div className="font-semibold">Total Remaining:</div>
            <div>
              {(
                totalNormalized -
                Object.values(operatorApplied).reduce((a, b) => a + b, 0)
              ).toLocaleString(undefined, {
                maximumFractionDigits: 1,
              })}{" "}
              {getNormalizedUnit(productPurchases[0]?.unit, product?.type)} (
              {(
                (totalNormalized -
                  Object.values(operatorApplied).reduce((a, b) => a + b, 0)) /
                parseFloat(productPurchases[0]?.unitSize || 1)
              ).toFixed(1)}{" "}
              {productPurchases[0]?.unit})
            </div>

            {Object.entries(operatorApplied).map(([name, val]) => {
              const remaining = totalNormalized - val;
              const unitSize = parseFloat(productPurchases[0]?.unitSize || 1);
              const purchaseUnit = productPurchases[0]?.unit || "";
              const normalizedUnit = getNormalizedUnit(
                purchaseUnit,
                product?.type
              );

              const isSeedByWeight =
                product?.type === "Seed" &&
                unitSize > 1 &&
                purchaseUnit !== normalizedUnit;

              const purchaseDisplayLabel = isSeedByWeight
                ? "units"
                : purchaseUnit;

              return (
                <div key={name} className="text-xs text-gray-600">
                  {name}:{" "}
                  {remaining.toLocaleString(undefined, {
                    maximumFractionDigits: 1,
                  })}{" "}
                  {normalizedUnit}({(remaining / unitSize).toFixed(1)}{" "}
                  {purchaseDisplayLabel})
                </div>
              );
            })}
          </div>

          <div className="border rounded p-3 bg-gray-50">
            <div className="font-semibold">Avg $/Norm Unit:</div>
            <div>${avgUnitPrice.toFixed(2)}</div>
          </div>
        </div>

        <h3 className="text-lg font-semibold mt-4 mb-2">Purchases</h3>
        <div className="hidden md:block">
          <table className="w-full text-sm border mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Date</th>
                <th className="border px-2 py-1">Vendor</th>
                <th className="border px-2 py-1">Amount</th>
                <th className="border px-2 py-1">Unit</th>
                <th className="border px-2 py-1">Unit Size</th>
                <th className="border px-2 py-1">Normalized</th>
                <th className="border px-2 py-1">Cost</th>
                <th className="border px-2 py-1">$/Unit</th>
              </tr>
            </thead>
            <tbody>
              {productPurchases.map((p) => {
                const normalized =
                  (parseFloat(p.amount) || 0) * (parseFloat(p.unitSize) || 1);
                const unitPrice =
                  parseFloat(p.amount) > 0
                    ? (parseFloat(p.cost) || 0) / parseFloat(p.amount)
                    : 0;

                return (
                  <tr key={p.id}>
                    <td className="border px-2 py-1">{p.date}</td>
                    <td className="border px-2 py-1">{p.vendorName || ""}</td>
                    <td className="border px-2 py-1 text-right">{p.amount}</td>
                    <td className="border px-2 py-1">{p.unit}</td>
                    <td className="border px-2 py-1 text-right">
                      {p.unitSize} {getNormalizedUnit(p.unit, p.type)}
                    </td>

                    <td className="border px-2 py-1 text-right">
                      {normalized.toFixed(2)}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      ${parseFloat(p.cost).toFixed(2)}
                    </td>
                    <td className="border px-2 py-1 text-right">
                      ${unitPrice.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="block md:hidden space-y-2 mb-6">
          {productPurchases.map((p) => {
            const normalized =
              (parseFloat(p.amount) || 0) * (parseFloat(p.unitSize) || 1);
            const unitPrice =
              normalized > 0 ? (parseFloat(p.cost) || 0) / normalized : 0;
            return (
              <div
                key={p.id}
                className="border rounded p-3 shadow-sm bg-gray-50"
              >
                <div className="text-xs uppercase text-gray-500 font-semibold">
                  {p.unit}
                </div>
                <div className="font-semibold text-sm">{product.name}</div>
                <div className="text-sm text-gray-700">
                  {p.amount} {p.unit} @ ${unitPrice.toFixed(2)} / {p.unit}
                </div>
                <div className="text-xs text-gray-500">
                  {normalized.toLocaleString()} normalized • {p.date}
                </div>
              </div>
            );
          })}
        </div>

        <h3 className="text-lg font-semibold mb-2">Usage</h3>
        <table className="w-full text-sm border mb-6 hidden md:table">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">Date</th>
              <th className="border px-2 py-1">Field</th>
              <th className="border px-2 py-1">Job</th>
              <th className="border px-2 py-1">Operator</th>
              <th className="border px-2 py-1">Rate</th>
              <th className="border px-2 py-1">Acres</th>
              <th className="border px-2 py-1">Applied</th>
              <th className="border px-2 py-1">$/Acre</th>
              <th className="border px-2 py-1">Crop</th>
            </tr>
          </thead>
          <tbody>
            {jobUsage.map((u, idx) => (
              <tr key={idx}>
                <td className="border px-2 py-1">
                  <Link
                    to={`/jobs/${u.jobId}`}
                    className="text-blue-600 underline"
                  >
                    {u.date || "--"}
                  </Link>
                </td>
                <td className="border px-2 py-1">{u.field}</td>
                <td className="border px-2 py-1 text-xs italic text-gray-600">
                  {u.jobType}
                </td>
                <td className="border px-2 py-1">{u.operator}</td>
                <td className="border px-2 py-1 text-right">
                  {u.rate} {u.unit}/ac
                </td>
                <td className="border px-2 py-1 text-right">{u.acres}</td>
                <td className="border px-2 py-1 text-right">
                  {u.applied.toFixed(2)} {u.unit}
                </td>

                <td className="border px-2 py-1 text-right">
                  {isFinite(u.rate) && isFinite(avgUnitPrice)
                    ? `$${(u.rate * avgUnitPrice).toFixed(2)}`
                    : "--"}
                </td>

                <td className="border px-2 py-1">{u.crop}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="block md:hidden space-y-2 mb-6">
          {jobUsage.map((u, idx) => (
            <div key={idx} className="border rounded p-3 shadow-sm bg-gray-50">
              <div className="text-xs uppercase text-gray-500 font-semibold">
                {u.jobType}
              </div>
              <div className="font-semibold text-sm">{product.name}</div>
              <div className="text-sm text-gray-700">
                {u.applied.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })}{" "}
                {u.unit} applied
              </div>
              {isFinite(u.rate) && isFinite(avgUnitPrice) && (
                <div className="text-xs text-gray-500">
                  Cost/acre: ${(u.rate * avgUnitPrice).toFixed(2)}
                </div>
              )}

              <div className="text-xs text-gray-500">
                {u.field} • {u.acres} ac @ {u.rate} {u.unit}/ac
              </div>
              <div className="text-xs text-gray-500">
                {u.operator} • {u.crop}
              </div>
              <div className="text-xs text-gray-500">
                <Link
                  to={`/jobs/${u.jobId}`}
                  className="text-blue-600 underline"
                >
                  {u.date || "--"}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-semibold mb-2">
          Expense Split Summary Totals
        </h3>
        <div className="text-sm">
          <div className="mb-2 font-semibold">Operators:</div>
          {Object.entries(operatorApplied).map(([name, val]) => {
            const cost = val * avgUnitPrice;
            const unitSize = parseFloat(productPurchases[0]?.unitSize || 1);
            const purchaseUnit = productPurchases[0]?.unit || "";
            const normalizedUnit = getNormalizedUnit(
              purchaseUnit,
              product?.type
            );

            const isSeedByWeight =
              product?.type === "Seed" &&
              unitSize > 1 &&
              purchaseUnit !== normalizedUnit;

            const purchaseLabel = isSeedByWeight ? "units" : purchaseUnit;
            const convertedAmount = (val / unitSize).toFixed(1);

            return (
              <div key={name} className="ml-4">
                {name}:{" "}
                {val.toLocaleString(undefined, { maximumFractionDigits: 1 })}{" "}
                {normalizedUnit}({convertedAmount} {purchaseLabel}) • $
                {cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            );
          })}

          <div className="mt-4 mb-2 font-semibold">Landowners:</div>
          {Object.entries(landownerApplied).map(([name, val]) => {
            const cost = val * avgUnitPrice;
            const unitCount =
              val / parseFloat(productPurchases[0]?.unitSize || 1);
            return (
              <div key={name} className="ml-4">
                {name}:{" "}
                {val.toLocaleString(undefined, { maximumFractionDigits: 1 })}{" "}
                {jobUsage[0]?.unit}({unitCount.toFixed(1)} units) • $
                {cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ProductSummaryModal;