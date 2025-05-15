import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";

export default function ProductUsageReport() {
  const [jobs, setJobs] = useState([]);
  const [products, setProducts] = useState({});
  const [fields, setFields] = useState({});
  const [vendors, setVendors] = useState({});
  const [productsByName, setProductsByName] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const [jobSnap, productSnap, fieldSnap, vendorSnap] = await Promise.all([
        getDocs(collection(db, "jobsByField")),
        getDocs(collection(db, "products")),
        getDocs(collection(db, "fields")),
        getDocs(collection(db, "vendors")),
      ]);

      const jobs = jobSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((job) => job.status === "Completed");

      const productMap = {};
      productSnap.forEach((doc) => (productMap[doc.id] = doc.data()));
      const byName = {};
      Object.values(productMap).forEach((p) => {
        if (p.name) byName[p.name] = p;
      });
      setProducts(productMap);
      setProductsByName(byName); // 🔹 New state

      const fieldMap = {};
      fieldSnap.forEach((doc) => (fieldMap[doc.id] = doc.data()));

      const vendorMap = {};
      vendorSnap.forEach((doc) => (vendorMap[doc.id] = doc.data()));

      setJobs(jobs);
      setProducts(productMap);
      setFields(fieldMap);
      setVendors(vendorMap);
    };

    fetchData();
  }, []);
const operatorSummary = {};

jobs.forEach((job) => {
  const field = fields[job.fieldId];
  if (!field) return;

  const operator = field.operator || "—";
  const acres = job.acres || field.gpsAcres || 0;

  if (!operatorSummary[operator]) operatorSummary[operator] = [];

  job.products?.forEach((p) => {
    const product = products[p.productId];
    if (!product) return;

const existing = operatorSummary[operator].find(
  (r) => r.productId === p.productId && r.unit === p.unit
);

  const operatorSplit = (job.operatorExpenseShare ?? 100) / 100;
const fullAmount = (p.rate || 0) * acres;


   const vendorName = p.vendorName || p.vendor || "—";

   console.log("[VENDOR DEBUG]", {
     jobId: job.id,
     field: field.fieldName,
     product: product.name,
     vendorFromProduct: p.vendor,
     vendorFromJob: job.vendor,
   });

const vendorAmount = fullAmount * operatorSplit;

if (existing) {
  existing.totalAmount += fullAmount;
  existing.vendors[vendorName] =
    (existing.vendors[vendorName] || 0) + vendorAmount;
} else {
  operatorSummary[operator].push({
    productName: product.name,
    productType: product.type,
    productId: p.productId,
    totalAmount: fullAmount,
    unit: p.unit || "—",
    acres,
    waterVolume: job.waterVolume || 0,
    vendors: { [vendorName]: vendorAmount },
  });
}


  });
});

function getStandardUnit(product, appliedUnit) {
  const unit = appliedUnit.toLowerCase();
  const type = product.type?.toLowerCase() || "";

  if (unit.includes("%") || unit.includes("v/v")) return "gallons";

  if (unit.includes("oz dry")) return "oz dry"; // ✅ dry formulation
  if (unit.includes("oz") && type === "chemical") return "gallons";
  if (unit.includes("pt")) return "gallons";
  if (unit.includes("qt")) return "gallons";
  if (unit.includes("fl oz")) return "gallons";

  if (type === "seed") return "units";
  if (type === "seed treatment") return "units";
  if (type === "fertilizer") return "tons";

  return appliedUnit;
}



function getStandardizedAmount(
  product,
  appliedTotal,
  appliedUnit,
  acres,
  waterVolume
) {
  const type = product.type || "";
  const crop = product.crop || "";
  const unit = appliedUnit.toLowerCase();
if (unit.includes("%") || unit.includes("v/v")) {
  return appliedTotal / 128;
}




  if (unit.includes("seeds")) {
    return crop === "Rice"
      ? appliedTotal / 900000
      : crop === "Soybeans"
      ? appliedTotal / 140000
      : appliedTotal;
  }

  if (unit.includes("lbs")) {
    if (type === "Seed") {
      return crop === "Rice"
        ? appliedTotal / 45
        : crop === "Soybeans"
        ? appliedTotal / 60
        : appliedTotal;
    } else if (type === "Fertilizer") {
      return appliedTotal / 2000; // lbs to tons
    } else {
      return appliedTotal;
    }
  }

 if (unit.includes("oz dry")) {
   return appliedTotal; // ✅ leave as oz
 }

  if (unit.includes("gallon")) return appliedTotal;
  if (unit.includes("quart")) return appliedTotal / 4;
  if (unit.includes("pint")) return appliedTotal / 8;
  if (unit.includes("fl oz")) return appliedTotal / 128;

  return appliedTotal;
}

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">🧪 Product Usage Report</h1>
      <p className="text-gray-600">
        All applied products across completed jobs, grouped by vendor, operator,
        and landowner.
      </p>
      <section>
        <h2 className="text-xl font-semibold mt-6 mb-2">Operator Summary</h2>

        {Object.entries(operatorSummary).map(([operator, rows]) => {
          const groupedByType = rows.reduce((acc, row) => {
            const type = row.productType || "Other";
            if (!acc[type]) acc[type] = [];
            acc[type].push(row);
            return acc;
          }, {});

          return (
            <div key={operator} className="mt-6">
              <h3 className="font-bold text-lg mb-2">{operator}</h3>

              {Object.entries(groupedByType).map(([type, products]) => (
                <div key={type} className="mb-4">
                  <h4 className="text-md font-semibold mb-1">{type}</h4>
                  <table className="min-w-full text-sm border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border px-2 py-1 text-left">Product</th>
                        <th className="border px-2 py-1 text-right">Applied</th>
                        <th className="border px-2 py-1 text-left">Unit</th>
                        <th className="border px-2 py-1 text-right">
                          Standardized
                        </th>
                        <th className="border px-2 py-1 text-left">
                          Standard Unit
                        </th>
                        <th className="border px-2 py-1 text-left">
                          Vendor Split
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...products]
                        .sort((a, b) =>
                          a.productName.localeCompare(b.productName)
                        )
                        .map((row) => {
                          const product = productsByName[row.productName];
                          const standardAmount = getStandardizedAmount(
                            product,
                            row.totalAmount,
                            row.unit,
                            row.acres,
                            row.waterVolume
                          );
                          const standardUnit = getStandardUnit(
                            product,
                            row.unit
                          );

                          return (
                            <tr key={`${row.productName}-${row.unit}`}>
                              <td className="border px-2 py-1">
                                {row.productName}
                              </td>
                              <td className="border px-2 py-1 text-right">
                                {row.totalAmount.toFixed(1)}
                              </td>
                              <td className="border px-2 py-1">
                                {row.unit.replace("/acre", "")}
                              </td>
                              <td className="border px-2 py-1 text-right">
                                {standardAmount.toFixed(2)}
                              </td>
                              <td className="border px-2 py-1">
                                {standardUnit}
                              </td>
                              <td className="border px-2 py-1 text-sm text-gray-700 space-y-1">
                                {Object.entries(row.vendors || {}).map(
                                  ([vendor, amt]) => (
                                    <div key={vendor} className="leading-tight">
                                      {vendor} –{" "}
                                      {getStandardizedAmount(
                                        product,
                                        amt,
                                        row.unit,
                                        row.acres,
                                        row.waterVolume
                                      ).toFixed(2)}{" "}
                                      {standardUnit}
                                    </div>
                                  )
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          );
        })}
      </section>
      <section>
        <h2 className="text-xl font-semibold mt-10 mb-2">Landowner Summary</h2>

        {Object.entries(
          jobs.reduce((acc, job) => {
            const field = fields[job.fieldId];
            if (!field) return acc;
            if (!job.landowner || (job.landownerExpenseShare ?? 0) === 0)
              return acc;

            const landowner = job.landowner;
            const acres = job.acres || field.gpsAcres || 0;

            if (!acc[landowner]) acc[landowner] = [];

            job.products?.forEach((p) => {
              const product = products[p.productId];
              if (!product) return;

              const existing = acc[landowner].find(
                (r) => r.productId === p.productId && r.unit === p.unit
              );

              const fullAmount = (p.rate || 0) * acres;
              const loSplit = (job.landownerExpenseShare ?? 0) / 100;
              const loAmount = fullAmount * loSplit;

         const vendorName = p.vendorName || p.vendor || "—";

         if (existing) {
           existing.totalAmount += loAmount;
           existing.vendors = existing.vendors || {};
           existing.vendors[vendorName] =
             (existing.vendors[vendorName] || 0) + loAmount;
         } else {
           acc[landowner].push({
             productName: product.name,
             productType: product.type,
             productId: p.productId,
             totalAmount: loAmount,
             unit: p.unit || "—",
             acres,
             waterVolume: job.waterVolume || 0,
             vendors: { [vendorName]: loAmount },
           });
         }

            });

            return acc;
          }, {})
        ).map(([landowner, rows]) => {
          const groupedByType = rows.reduce((acc, row) => {
            const type = row.productType || "Other";
            if (!acc[type]) acc[type] = [];
            acc[type].push(row);
            return acc;
          }, {});

          return (
            <div key={landowner} className="mt-6">
              <h3 className="font-bold text-lg mb-2">{landowner}</h3>

              {Object.entries(groupedByType).map(([type, products]) => (
                <div key={type} className="mb-4">
                  <h4 className="text-md font-semibold mb-1">{type}</h4>
                  <table className="min-w-full text-sm border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border px-2 py-1 text-left">Product</th>
                        <th className="border px-2 py-1 text-right">Applied</th>
                        <th className="border px-2 py-1 text-left">Unit</th>
                        <th className="border px-2 py-1 text-right">
                          Standardized
                        </th>
                        <th className="border px-2 py-1 text-left">
                          Standard Unit
                        </th>
                        <th className="border px-2 py-1 text-left">
                          Vendor Split
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {[...products]
                        .sort((a, b) =>
                          a.productName.localeCompare(b.productName)
                        )
                        .map((row) => {
                          const product = productsByName[row.productName];
                          const standardAmount = getStandardizedAmount(
                            product,
                            row.totalAmount,
                            row.unit,
                            row.acres,
                            row.waterVolume
                          );
                          const standardUnit = getStandardUnit(
                            product,
                            row.unit
                          );

                          return (
                            <tr key={`${row.productName}-${row.unit}`}>
                              <td className="border px-2 py-1">
                                {row.productName}
                              </td>
                              <td className="border px-2 py-1 text-right">
                                {row.totalAmount.toFixed(1)}
                              </td>
                              <td className="border px-2 py-1">
                                {row.unit.replace("/acre", "")}
                              </td>
                              <td className="border px-2 py-1 text-right">
                                {standardAmount.toFixed(2)}
                              </td>
                              <td className="border px-2 py-1">
                                {standardUnit}
                              </td>
                              <td className="border px-2 py-1 text-sm text-gray-700 space-y-1">
                                {Object.entries(row.vendors || {}).map(
                                  ([vendor, amt]) => (
                                    <div key={vendor} className="leading-tight">
                                      {vendor} –{" "}
                                      {getStandardizedAmount(
                                        product,
                                        amt,
                                        row.unit,
                                        row.acres,
                                        row.waterVolume
                                      ).toFixed(2)}{" "}
                                      {standardUnit}
                                    </div>
                                  )
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          );
        })}
      </section>

      {/* Placeholders for now */}
      <div className="bg-yellow-100 border border-yellow-400 p-4 rounded">
        Operator Summary • Landowner Summary • Product Summary • Vendor Summary
      </div>
    </div>
  );
}
