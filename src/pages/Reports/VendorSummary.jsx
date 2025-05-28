// ✅ Final version – product cards per entry
// ✅ Correct applied units (seeds for population seed)
// ✅ Correct difference line unit display (e.g., fl oz + gal)
// ✅ One card per product (mobile-friendly), with purchase table removed
// ✅ Purchase + normalized amount + unit size shown clearly

import React, { useEffect, useState, useContext } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import ReportControls from "../../components/reports/ReportControls";
import { CropYearContext } from "../../context/CropYearContext";
import { saveAs } from "file-saver";
import { generatePDFfromElement } from "../../utils/exportPDF";

export default function VendorSummary() {
  const [purchases, setPurchases] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [filterState, setFilterState] = useState({});
  const [sort, setSort] = useState("az");
  const { cropYear } = useContext(CropYearContext);

  const unitConversionMap = {
    lbs: { to: "tons", factor: 1 / 2000 },
    tons: { to: "lbs", factor: 2000 },
    "fl oz": { to: "gal", factor: 1 / 128 },
    gal: { to: "fl oz", factor: 128 },
    qt: { to: "fl oz", factor: 32 },
    pt: { to: "fl oz", factor: 16 },
    oz: { to: "lbs", factor: 1 / 16 },
    units: { to: "lbs", factor: 1 },
  };

  const getNormalizedUnit = (unit, type, rateType) => {
    const u = unit?.toLowerCase();
    if (type === "Seed" && rateType === "Population") return "seeds";
    if (type === "Seed" && u === "units") return "lbs";
    if (["gal", "qt", "pt"].includes(u)) return "fl oz";
    if (u === "tons") return "lbs";
    if (u === "oz") return type === "Chemical" ? "oz" : "lbs";
    return u;
  };

  useEffect(() => {
    const fetchData = async () => {
      const [purchaseSnap, jobSnap] = await Promise.all([
        getDocs(collection(db, "inputPurchases")),
        getDocs(collection(db, "jobsByField")),
      ]);
      const allPurchases = purchaseSnap.docs
        .map((d) => d.data())
        .filter((p) => String(p.cropYear) === String(cropYear));
      const allJobs = jobSnap.docs
        .map((d) => d.data())
        .filter((j) => String(j.cropYear) === String(cropYear));
      setPurchases(allPurchases);
      setJobs(allJobs);
    };
    fetchData();
  }, [cropYear]);

  const avgCostMap = {};
  purchases.forEach((p) => {
    const key = p.productId;
    const unitSize = parseFloat(p.unitSize) || 1;
    const normalized = (parseFloat(p.amount) || 0) * unitSize;
    if (!avgCostMap[key])
      avgCostMap[key] = {
        total: 0,
        cost: 0,
        unit: p.unit,
        type: p.type,
        rateType: p.rateType,
      };
    avgCostMap[key].total += normalized;
    avgCostMap[key].cost += parseFloat(p.cost) || 0;
  });
  Object.entries(avgCostMap).forEach(([key, val]) => {
    val.avg = val.total > 0 ? val.cost / val.total : 0;
    val.normUnit = getNormalizedUnit(val.unit, val.type, val.rateType);
  });

  const appliedMap = {};
  jobs.forEach((job) => {
    const acres =
      job.riceLeveeAcres ??
      job.beanLeveeAcres ??
      job.drawnAcres ??
      job.acres ??
      0;
    (job.products || []).forEach((p) => {
      const key = p.productId;
      const rate = parseFloat(p.rate) || 0;
      const u = p.unit?.toLowerCase();
      const normalized = unitConversionMap[u]
        ? rate * acres * unitConversionMap[u].factor
        : rate * acres;
      if (!appliedMap[key]) appliedMap[key] = { amount: 0 };
      appliedMap[key].amount += normalized;
    });
  });
  Object.entries(appliedMap).forEach(([key, val]) => {
    val.cost = val.amount * (avgCostMap[key]?.avg || 0);
  });

  const groupedByVendor = {};
  purchases.forEach((p) => {
    const vendor = p.vendorName || "Unknown";
    if (!groupedByVendor[vendor]) groupedByVendor[vendor] = [];
    groupedByVendor[vendor].push(p);
  });

  const vendorTotals = Object.entries(groupedByVendor).map(
    ([vendor, entries]) => {
      const total = entries.reduce(
        (sum, p) => sum + (parseFloat(p.cost) || 0),
        0
      );
      return { vendor, total };
    }
  );
  const totalAll = vendorTotals.reduce((sum, v) => sum + v.total, 0);

  const handleExport = (format) => {
    if (format === "csv") {
      let csv = "Vendor,Product,Amount,Unit,Cost,Date\n";
      purchases.forEach((p) => {
        csv += `${p.vendorName},${p.productName},${p.amount},${p.unit},${p.cost},${p.date}\n`;
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, `VendorSummary_${cropYear}.csv`);
    }
    if (format === "pdf") {
      const el = document.getElementById("report-container");
      generatePDFfromElement(el, `VendorSummary_${cropYear}.pdf`);
    }
  };

  return (
    <div id="report-container" className="p-6 max-w-5xl mx-auto">
      <div className="no-print">
        <ReportControls
          title="Vendor Summary"
          sortOptions={[
            { label: "Vendor A–Z", value: "az" },
            { label: "Vendor Z–A", value: "za" },
          ]}
          filters={[
            {
              label: "Operator",
              type: "select",
              key: "operator",
              options: ["PCF", "TCF"],
            },
          ]}
          onFilterChange={setFilterState}
          selectedSort={sort}
          onSortChange={setSort}
          onExport={handleExport}
        />
      </div>

      <div className="bg-gray-100 border rounded p-4 mb-6 shadow-sm">
        <h4 className="text-lg font-semibold mb-2">{cropYear} Vendor Totals</h4>
        <ul className="text-sm text-gray-800 space-y-1">
          {vendorTotals.map(({ vendor, total }) => (
            <li key={vendor} className="flex justify-between">
              <span>{vendor}</span>
              <span className="font-mono">
                ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </li>
          ))}
        </ul>
        <hr className="my-2" />
        <p className="text-sm font-medium flex justify-between">
          <span>Total Purchases</span>
          <span className="font-mono text-right">
            ${totalAll.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </p>
      </div>

      {Object.entries(groupedByVendor).map(([vendor, entries]) => (
        <div key={vendor} className="mb-8">
          <h2 className="text-xl font-bold mb-2">{vendor}</h2>
          <p className="text-sm text-gray-600 mb-4">
            Total Purchased: $
            {entries
              .reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0)
              .toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>

          {entries.map((p, idx) => {
            const key = p.productId;
            const applied = appliedMap[key] || { amount: 0, cost: 0 };
            const avg = avgCostMap[key]?.avg || 0;
            const normUnit = avgCostMap[key]?.normUnit || p.unit;
            const unitSize = parseFloat(p.unitSize) || 1;
            const normAmount = (parseFloat(p.amount) || 0) * unitSize;
            const converted = unitConversionMap[normUnit];
            const convertedAmount = converted
              ? normAmount * (1 / converted.factor)
              : null;
            const diffAmount = normAmount - applied.amount;
            const diffCost = (parseFloat(p.cost) || 0) - applied.cost;

            return (
              <div key={idx} className="bg-white p-4 mb-4 rounded shadow">
                <h3 className="font-semibold text-md mb-1">{p.productName}</h3>
                <div className="text-xs text-gray-500 mb-1">
                  Avg Cost: ${avg.toFixed(2)} per {normUnit}
                </div>
                <div className="text-sm">
                  Applied: {applied.amount.toFixed(2)} {normUnit} • $
                  {applied.cost.toFixed(2)}
                </div>
                <div className="text-sm">
                  Purchased: {normAmount.toFixed(2)} {normUnit} ({p.amount}{" "}
                  {p.unit}) • ${parseFloat(p.cost).toFixed(2)}
                </div>
                <div className="text-sm">
                  Difference: {diffAmount.toFixed(2)} {normUnit}
                  {convertedAmount
                    ? ` (${convertedAmount.toFixed(2)} ${converted.to})`
                    : ""}{" "}
                  • ${diffCost.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
