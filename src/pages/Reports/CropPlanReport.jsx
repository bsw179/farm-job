import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useCropYear } from "../../context/CropYearContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
export default function CropPlanReport() {
  const { cropYear } = useCropYear();

  const [jobs, setJobs] = useState([]);
  const [products, setProducts] = useState({});
  const [fields, setFields] = useState({});
  const [filterType, setFilterType] = useState("");
const [filterValues, setFilterValues] = useState([]);
  const [sortKey, setSortKey] = useState("Farm");

  useEffect(() => {
    const fetchData = async () => {
      const [jobSnap, productSnap, fieldSnap] = await Promise.all([
        getDocs(collection(db, "jobsByField")),
        getDocs(collection(db, "products")),
        getDocs(collection(db, "fields")),
      ]);

      const productMap = {};
      productSnap.docs.forEach((doc) => {
        productMap[doc.id] = { id: doc.id, ...doc.data() };
      });

      const fieldMap = {};
      fieldSnap.docs.forEach((doc) => {
        fieldMap[doc.id] = { id: doc.id, ...doc.data() };
      });

      const seedJobs = jobSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((j) => {
          const jobName = j.jobType?.name?.toLowerCase?.() || "";
          return (
            j.jobType?.parentName === "Seeding" &&
            Number(j.cropYear) === Number(cropYear) &&
            !jobName.includes("levee") &&
            !jobName.includes("pack")
          );
        });

      setJobs(seedJobs);
      setProducts(productMap);
      setFields(fieldMap);
    };

    fetchData();
  }, [cropYear]);

  const latestSeedJobByField = useMemo(() => {
    const map = {};

    jobs.forEach((job) => {
      if (!job.fieldId) return;

      const existing = map[job.fieldId];
      const jobTime = job.jobDate ? new Date(job.jobDate).getTime() : 0;
      const existingTime = existing?.jobDate
        ? new Date(existing.jobDate).getTime()
        : 0;

      if (!existing || jobTime >= existingTime) {
        map[job.fieldId] = job;
      }
    });

    return map;
  }, [jobs]);

  const filteredFields = useMemo(() => {
    const allFields = Object.values(fields).filter((field) => {
      const assignedCrop = field.crops?.[cropYear]?.crop || "";

      if (!filterType || filterValues.length === 0) return true;

      if (filterType === "Farm") return filterValues.includes(field.farmName);
      if (filterType === "Operator")
        return filterValues.includes(field.operator);
      if (filterType === "Crop") return filterValues.includes(assignedCrop);

      return true;
    });

    return allFields;
  }, [fields, cropYear, filterType, filterValues]);

  const sortedRows = useMemo(() => {
    const rows = filteredFields.map((field) => {
      const assignedCrop = field.crops?.[cropYear]?.crop || "—";
      const seedJob = latestSeedJobByField[field.id];
      const jobProduct = seedJob?.products?.[0];

      const productFromMap = jobProduct?.productId
        ? products[jobProduct.productId]
        : null;

      const variety = jobProduct?.productName || productFromMap?.name || "—";

      const rate =
        seedJob && jobProduct?.rate
          ? `${jobProduct.rate} ${jobProduct.unit || ""}`.trim()
          : "—";

      const vendor =
        jobProduct?.vendorName || seedJob?.vendorName || seedJob?.vendor || "—";

      return {
        farm: field.farmName || "—",
        field: field.fieldName || "—",
        acres: field.gpsAcres || "—",
        crop: assignedCrop || "—",
        operator: field.operator || "—",
        variety: seedJob ? variety : "—",
        rate: seedJob ? rate : "—",
        vendor: seedJob ? vendor : "—",
      };
    });

    return rows.sort((a, b) => {
      if (sortKey === "Farm") {
        return a.farm === b.farm
          ? a.field.localeCompare(b.field)
          : a.farm.localeCompare(b.farm);
      }
      if (sortKey === "Field") return a.field.localeCompare(b.field);
      if (sortKey === "Acres")
        return Number(a.acres || 0) - Number(b.acres || 0);
      if (sortKey === "Crop") return a.crop.localeCompare(b.crop);
      if (sortKey === "Operator") return a.operator.localeCompare(b.operator);
      if (sortKey === "Variety") return a.variety.localeCompare(b.variety);
      if (sortKey === "Vendor") return a.vendor.localeCompare(b.vendor);
      return 0;
    });
  }, [filteredFields, cropYear, latestSeedJobByField, products, sortKey]);
const handleExportCSV = () => {
  const header = [
    "Farm",
    "Field Name",
    "GPS Acres",
    "Crop",
    "Operator",
    "Variety",
    "Rate",
    "Vendor",
  ];

  const rows = sortedRows.map((row) => [
    row.farm,
    row.field,
    row.acres,
    row.crop,
    row.operator,
    row.variety,
    row.rate,
    row.vendor,
  ]);

  const csv = [header, ...rows]
    .map((r) =>
      r
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `crop-plan-report-${cropYear}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const handleExportPDF = () => {
  const doc = new jsPDF();

  autoTable(doc, {
    head: [
      [
        "Farm",
        "Field Name",
        "GPS Acres",
        "Crop",
        "Operator",
        "Variety",
        "Rate",
        "Vendor",
      ],
    ],
    body: sortedRows.map((row) => [
      row.farm,
      row.field,
      row.acres,
      row.crop,
      row.operator,
      row.variety,
      row.rate,
      row.vendor,
    ]),
    startY: 18,
    theme: "grid",
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  doc.setFontSize(12);
  doc.text(`Crop Plan Report - ${cropYear}`, 14, 12);
  doc.save(`crop-plan-report-${cropYear}.pdf`);
};
  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold">Crop Plan Report - {cropYear}</h1>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <label className="text-sm font-semibold">Filter by:</label>

        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setFilterValues([]);
          }}
          className="border px-2 py-1 rounded"
        >
          <option value="">None</option>
          <option value="Farm">Farm</option>
          <option value="Operator">Operator</option>
          <option value="Crop">Crop</option>
        </select>

        {filterType && (
          <select
            multiple
            value={filterValues}
            onChange={(e) =>
              setFilterValues(
                Array.from(e.target.selectedOptions, (option) => option.value),
              )
            }
            className="border px-2 py-1 rounded min-w-[220px] h-32"
          >
            {Array.from(
              new Set(
                Object.values(fields).map((f) => {
                  if (filterType === "Farm") return f.farmName;
                  if (filterType === "Operator") return f.operator;
                  if (filterType === "Crop") return f.crops?.[cropYear]?.crop;
                  return null;
                }),
              ),
            )
              .filter(Boolean)
              .sort()
              .map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
          </select>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold mr-2">Sort by:</span>
          {[
            "Farm",
            "Field",
            "Acres",
            "Crop",
            "Operator",
            "Variety",
            "Vendor",
          ].map((key) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={`px-3 py-1 rounded border ${
                sortKey === key ? "bg-blue-600 text-white" : "bg-white"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-start gap-2 mb-4">
        <button
          onClick={handleExportPDF}
          className="px-3 py-1 border rounded bg-white"
        >
          Export PDF
        </button>
        <button
          onClick={handleExportCSV}
          className="px-3 py-1 border rounded bg-white"
        >
          Export CSV
        </button>
      </div>
      <section>
        <h2 className="text-xl font-semibold">Field Crop Plan</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Farm</th>
                <th className="border px-2 py-1">Field Name</th>
                <th className="border px-2 py-1">GPS Acres</th>
                <th className="border px-2 py-1">Crop</th>
                <th className="border px-2 py-1">Operator</th>
                <th className="border px-2 py-1">Variety</th>
                <th className="border px-2 py-1">Rate</th>
                <th className="border px-2 py-1">Vendor</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
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
    </div>
  );
}
