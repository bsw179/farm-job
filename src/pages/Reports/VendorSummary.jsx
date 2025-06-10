// VendorSummary.jsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from "../../firebase";
import { useCropYear } from "../../context/CropYearContext";

export default function VendorSummary() {
  const { cropYear } = useCropYear();

  // 🔹 Firestore data
  const [purchases, setPurchases] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);

  // 🔹 Final grouped data
  const [groupedData, setGroupedData] = useState({});
  useEffect(() => {
    const loadData = async () => {
      const [purchaseSnap, jobSnap, productSnap, vendorSnap] =
        await Promise.all([
          getDocs(collection(db, "inputPurchases")),
          getDocs(collection(db, "jobsByField")),
          getDocs(collection(db, "products")),
          getDocs(collection(db, "vendors")),
        ]);

      const allPurchases = purchaseSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      const allJobs = jobSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const allProducts = productSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      const allVendors = vendorSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setPurchases(
        allPurchases.filter((p) => String(p.cropYear) === String(cropYear))
      );
      setJobs(allJobs.filter((j) => String(j.cropYear) === String(cropYear)));
      setProducts(allProducts);
      setVendors(allVendors);
    };

    loadData();
  }, [cropYear]);
  const getProductById = (id) => products.find((p) => p.id === id);
  const getVendorById = (id) => vendors.find((v) => v.id === id);

  const getNormalizedUnit = (unit, type) => {
    const u = (unit || "").toLowerCase();
    if (type === "Seed" && u === "units") return "lbs";
    if (type === "Seed" && u === "seeds") return "seeds";
    if (["gal", "qt", "pt"].includes(u)) return "fl oz";
    if (u === "tons") return "lbs";
    if (u === "oz") return type === "Chemical" ? "oz" : "lbs";
    return u;
  };
const getDefaultUnitSize = (unit, productType, rateType, crop) => {
  if (productType === "Chemical") {
    switch (unit) {
      case "gal":
        return 128;
      case "qt":
        return 32;
      case "pt":
        return 16;
      case "fl oz":
        return 1;
      case "oz":
        return 1;
      case "lbs":
        return 16;
      case "%v/v":
        return 128;
      default:
        return 1;
    }
  }
  if (productType === "Fertilizer") {
    if (unit === "tons") return 2000;
    if (unit === "lbs") return 1;
  }
  if (productType === "Seed") {
    if (rateType === "Population") {
      if (crop?.toLowerCase().includes("rice")) return 900000;
      if (crop?.toLowerCase().includes("soy")) return 140000;
    }
  }
  if (productType === "Seed Treatment") return 1;
  return 1;
};

const formatAmount = (amount, unit, unitSize, type) => {
  return `${amount.toFixed(2)} ${unit}`;
};



  const formatCurrency = (value) =>
    `$${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  useEffect(() => {
    if (!jobs.length || !products.length || !vendors.length) return;

    const result = {};

    // 🟢 PHASE 1: Seed structure with job usage
    jobs.forEach((j) => {
      const acres =
        j.riceLeveeAcres ?? j.beanLeveeAcres ?? j.drawnAcres ?? j.acres ?? 0;

      (j.products || []).forEach((p) => {
        const rate = parseFloat(p.rate || 0);
        if (!isFinite(acres) || !isFinite(rate)) return;
        const applied = rate * acres;
        if (!isFinite(applied)) return;

const vendorNameRaw =
  p.vendorName?.trim() ||
  p.vendor?.trim() ||
  j.vendorName?.trim() ||
  j.vendor?.trim() ||
  "Unknown Vendor";


      // Match vendor name exactly to vendor from Firestore if available
      const vendorMatch = vendors.find(
        (v) => v.name?.trim().toLowerCase() === vendorNameRaw.toLowerCase()
      );
      const vendorName = vendorMatch?.name || vendorNameRaw;


        const productId = p.productId;
        if (!productId || !vendorName) {
          console.warn("❌ Missing key info", {
            jobId: j.id,
            productName: p.productName,
            productId,
            vendorName,
            pVendor: p.vendorName,
            jVendor: j.vendorName,
          });
        }

        const product = getProductById(productId);
        if (!product) return;
console.log("🧩 GROUPING JOB PRODUCT", {
  jobId: j.id,
  field: j.fieldName || j.fieldId,
  productId,
  productName: p.productName,
  vendorName,
  applied,
});

        if (!result[vendorName]) result[vendorName] = {};
        if (!result[vendorName][productId]) {
          result[vendorName][productId] = {
            product,
            purchases: [],
            applied: 0,
            appliedJobs: [],
            purchaseTotal: 0,
            normalizedTotal: 0,
          };
        }

        result[vendorName][productId].applied += applied;
        result[vendorName][productId].appliedJobs.push({
          ...j,
          rate,
          acres,
          applied,
          unit: p.unit || "",
        });
      });
    });

    // 🟡 PHASE 2: Fill in purchase data
    purchases.forEach((p) => {
      const vendor = getVendorById(p.vendorId);
      const product = getProductById(p.productId);
      if (!product || !vendor) return;

      const vendorName = vendor.name;
      const normAmount =
        parseFloat(p.amount || 0) * parseFloat(p.unitSize || 1);

      if (!result[vendorName]) result[vendorName] = {};
      if (!result[vendorName][p.productId]) {
        result[vendorName][p.productId] = {
          product,
          purchases: [],
          applied: 0,
          appliedJobs: [],
          purchaseTotal: 0,
          normalizedTotal: 0,
        };
      }

      result[vendorName][p.productId].purchases.push(p);
      result[vendorName][p.productId].purchaseTotal += parseFloat(p.cost || 0);
      result[vendorName][p.productId].normalizedTotal += normAmount;
    });

    setGroupedData(result);
  }, [purchases, jobs, products, vendors]);

  
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">
        Vendor Summary – {cropYear}
      </h1>
      <div className="bg-gray-100 border rounded p-4 mb-6 shadow-sm">
        <h4 className="text-lg font-semibold mb-2">Vendor Totals</h4>
        <ul className="text-sm text-gray-800 space-y-1">
          {Object.entries(groupedData).map(([vendor, products]) => {
            const total = Object.values(products).reduce(
              (sum, entry) => sum + (entry.purchaseTotal || 0),
              0
            );
            return (
              <li key={vendor} className="flex justify-between">
                <span>{vendor}</span>
                <span className="font-mono">
                  $
                  {total.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {Object.entries(groupedData).map(([vendorName, productsById]) => (
        <div key={vendorName} className="mb-10">
          <h2 className="text-lg font-bold text-blue-700 mb-4">{vendorName}</h2>

          {Object.values(productsById).map((entry) => {
            const {
              product,
              purchases,
              applied,
              normalizedTotal,
              purchaseTotal,
              appliedJobs,
            } = entry;
            const unit = purchases[0]?.unit || "";
            const unitSize = parseFloat(purchases[0]?.unitSize || 1);
            const normUnit = getNormalizedUnit(unit, product.type);
            const avgUnitCost =
              normalizedTotal > 0 ? purchaseTotal / normalizedTotal : 0;
            const appliedCost = applied * avgUnitCost;
            const diffAmount = normalizedTotal - applied;
            const diffCost = diffAmount * avgUnitCost;

            return (
              <div
                key={product.id}
                className="mb-6 border rounded-lg shadow-sm bg-white p-4"
              >
                <div className="text-md font-semibold mb-1">
                  {product.name}{" "}
                  <span className="text-gray-500 text-sm">
                    ({product.type})
                  </span>
                </div>

                <div className="text-sm text-gray-700">
                  <div>
                    Applied: {applied.toFixed(2)}{" "}
                    {appliedJobs[0]?.unit === "%v/v"
                      ? "fl oz"
                      : appliedJobs[0]?.unit || ""}
                    • {formatCurrency(appliedCost)}
                  </div>
                  <div>
                    Purchased:{" "}
                    {formatAmount(
                      normalizedTotal / unitSize,
                      unit,
                      unitSize,
                      product.type
                    )}{" "}
                    • {formatCurrency(purchaseTotal)}
                  </div>
                  <div className="font-semibold">
                    Difference:{" "}
                    {formatAmount(
                      diffAmount / unitSize,
                      unit,
                      unitSize,
                      product.type
                    )}{" "}
                    • {formatCurrency(diffCost)}
                  </div>
                  <div className="mt-4 text-sm text-gray-700 space-y-1">
                    <div className="font-semibold">Expense Split:</div>

                    {/* Operator Splits */}
                    {Object.entries(
                      appliedJobs.reduce((acc, job) => {
                        const share = job.operatorExpenseShare ?? 100;
                        const name = job.operator ?? "Unknown Operator";
                        acc[name] =
                          (acc[name] || 0) + job.applied * (share / 100);
                        return acc;
                      }, {})
                    ).map(([name, amt]) => (
                      <div key={`op-${name}`} className="ml-4">
                        {name}: {amt.toFixed(2)} {appliedJobs[0]?.unit || ""}
                      </div>
                    ))}

                    {/* Landowner Splits */}
                    {Object.entries(
                      appliedJobs.reduce((acc, job) => {
                        const share = job.landownerExpenseShare ?? 0;
                        const name = job.landowner ?? "Unknown Landowner";
                        if (share > 0) {
                          acc[name] =
                            (acc[name] || 0) + job.applied * (share / 100);
                        }
                        return acc;
                      }, {})
                    ).map(([name, amt]) => (
                      <div
                        key={`lo-${name}`}
                        className="ml-4 italic text-gray-600"
                      >
                        {name}: {amt.toFixed(2)} {appliedJobs[0]?.unit || ""}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
