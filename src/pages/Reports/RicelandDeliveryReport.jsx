// src/pages/Reports/RicelandDeliveryReport.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { useCropYear } from "@/context/CropYearContext";
import { parseISO, format } from "date-fns";
import { saveAs } from "file-saver";

export default function RicelandDeliveryReport() {
  const { cropYear } = useCropYear();
  const [fields, setFields] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [grouped, setGrouped] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const fieldSnap = await getDocs(collection(db, "fields"));
      const jobSnap = await getDocs(collection(db, "jobsByField"));

      const allFields = fieldSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const allJobs = jobSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setFields(allFields);
      setJobs(allJobs);

      const tempGrouped = {};

      allFields.forEach((field) => {
        const operator = field.operator || "Unknown Operator";
        const farmNumber = field.farmNumber || "—";

        if (operator.toLowerCase().includes("test") || farmNumber === "123")
          return;

        const cropData = field.crops?.[cropYear] || {};
        const key = `${operator}__${farmNumber}`;

        if (!tempGrouped[key]) tempGrouped[key] = [];
        tempGrouped[key].push({ ...field, cropData });
      });

      setGrouped(tempGrouped);
    };

    fetchData();
  }, [cropYear, setFields, setJobs]);

  const handleExportCSV = () => {
    const rows = [];

    
    // 🧠 Build a map of fieldId → most-used seed variety
    const fieldToVarietyMap = {};

    jobs
      .filter(
        (j) =>
          j.cropYear === cropYear &&
          j.jobType?.parentName === "Seeding" &&
          j.jobType?.name !== "Levee Seeding"
      )
      .forEach((job) => {
        const fieldId = job.fieldId;
        const acres = job.acres || 0;

        job.products?.forEach((p) => {
          if (p.type !== "Seed") return;
          const variety = p.productName || "—";
          const rate = p.rate || 0;
          const totalUsed = rate * acres;

          if (!fieldToVarietyMap[fieldId]) {
            fieldToVarietyMap[fieldId] = {};
          }

          fieldToVarietyMap[fieldId][variety] =
            (fieldToVarietyMap[fieldId][variety] || 0) + totalUsed;
        });
      });

    // 🔍 For each field, keep only the top-used variety
    Object.entries(fieldToVarietyMap).forEach(([fieldId, varietyTotals]) => {
      const topVariety = Object.entries(varietyTotals).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0];

      fieldToVarietyMap[fieldId] = topVariety || "—";
    });

    Object.entries(grouped)
      .sort(([aKey], [bKey]) => {
        const [aOperator] = aKey.split("__");
        const [bOperator] = bKey.split("__");

        if (aOperator === "TCF") return -1;
        if (bOperator === "TCF") return 1;
        if (aOperator === "PCF") return -1;
        if (bOperator === "PCF") return 1;

        return aOperator.localeCompare(bOperator);
      })
      .forEach(([key, fields]) => {
                const [operator, farmNumber] = key.split("__");
        rows.push([]); // blank row between blocks
        rows.push([`Operator: ${operator}`, `Farm #: ${farmNumber}`]);
        rows.push([
          "Field Name",
          "Crop",
          "Variety",
          "Acres",
          "Planting Date",
          "County",
          "Split (Tenant / Landlord)",
        ]);

        // Push field-level rows
        [...fields]
          .sort((a, b) => (a.fieldName || "").localeCompare(b.fieldName || ""))
          .forEach((field) => {
            const crop = field.cropData?.crop || "—";
            const variety = fieldToVarietyMap[field.id] || "—";

            const acres = field.fsaAcres || 0;
            const county = field.county || "—";

            const plantingJob = jobs
              .filter(
                (j) =>
                  j.fieldId === field.id &&
                  j.cropYear === cropYear &&
                  j.jobType?.parentName === "Seeding" &&
                  !["Seed and Pack", "Pack"].includes(j.jobType?.name || "")
              )
              .sort((a, b) => new Date(a.jobDate) - new Date(b.jobDate))[0];

            const plantingDate = plantingJob?.jobDate
              ? format(parseISO(plantingJob.jobDate), "MM-dd-yyyy")
              : "—";

            const rentShares = [
              { name: operator, share: field.operatorRentShare || 0 },
              ...(field.landowners?.length > 0
                ? field.landowners.map((l) => ({
                    name: l.name,
                    share: l.rentShare,
                  }))
                : [
                    {
                      name: field.landowner || "—",
                      share: field.landownerRentShare || 0,
                    },
                  ]),
            ];

            const split = rentShares
              .map((r) => `${r.name} (${r.share}%)`)
              .join("; ");

            rows.push([
              field.fieldName || "—",
              crop,
              variety,
              acres,
              plantingDate,
              county,
              split,
            ]);
          });

        // 📊 Add summary for this farm by variety
        const farmSummary = {};
        fields.forEach((field) => {
          const variety = fieldToVarietyMap[field.id] || "—";
          const acres = Number(field.fsaAcres || 0);
          farmSummary[variety] = (farmSummary[variety] || 0) + acres;
        });

        rows.push([]);
        rows.push([`Total by Variety for Farm ${farmNumber}`]);
        Object.entries(farmSummary).forEach(([variety, total]) => {
          rows.push(["", "", "", variety, total.toFixed(2)]);
        });

        rows.push([]);
      });

    // 📦 Add operator-level totals by variety
    rows.push([]);
    rows.push(["Operator-Level Total by Variety"]);

    const operatorTotals = {};

    Object.entries(grouped).forEach(([key, fields]) => {
      const [operator] = key.split("__");

      if (!operatorTotals[operator]) operatorTotals[operator] = {};

      fields.forEach((field) => {
        const variety = fieldToVarietyMap[field.id] || "—";
        const acres = Number(field.fsaAcres || 0);
        operatorTotals[operator][variety] =
          (operatorTotals[operator][variety] || 0) + acres;
      });
    });
    

    Object.entries(operatorTotals).forEach(([operator, varietyTotals]) => {
      rows.push([]);
      rows.push([operator]);
      Object.entries(varietyTotals).forEach(([variety, total]) => {
        rows.push(["", "", "", variety, total.toFixed(2)]);
      });
    });

    const csvContent = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `RicelandDeliveryReport_${cropYear}.csv`);
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">
        📦 Riceland Delivery Report – {cropYear}
      </h1>
      <button
        onClick={handleExportCSV}
        className="bg-green-600 text-white px-4 py-2 rounded shadow text-sm"
      >
        ⬇️ Export CSV
      </button>
    </div>
  );
}
