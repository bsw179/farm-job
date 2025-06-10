// src/pages/Reports/FsaPlantingDateReport.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { useCropYear } from "@/context/CropYearContext";
import { format, parseISO } from "date-fns";
import { saveAs } from "file-saver";

export default function FsaPlantingDateReport() {
  const { cropYear } = useCropYear();
  const [fields, setFields] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [groupedFields, setGroupedFields] = useState({});

  const summarizeAllByOperatorCounty = (fields, cropYear) => {
    const summary = {};

  fields.forEach((field) => {
    const operator = field.operator || "Unknown Operator";
    const farmName = field.farmName || "";
    const farmNumber = field.farmNumber || "";

    const isTest =
      operator.toLowerCase().includes("test") ||
      farmName.toLowerCase().includes("test") ||
      farmNumber === "123";

    if (isTest) return;

    const county = field.county || "—";
    const crop = field.crops?.[cropYear]?.crop || "—";
    const outcome = field.crops?.[cropYear]?.outcome || "—";
    const acres = Number(field.fsaAcres || 0);

    const opKey = `${operator}__${county}`;
    const cropKey = `${crop}__${outcome}`;

    if (!summary[opKey]) summary[opKey] = {};
    if (!summary[opKey][cropKey])
      summary[opKey][cropKey] = { crop, outcome, acres: 0 };

    summary[opKey][cropKey].acres += acres;
  });

  return summary;

  };

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

      // 🧠 Group by operator → farm → tract
    const grouped = {};

    allFields.forEach((field) => {
      const operator = field.operator || "Unknown Operator";
      const farmName = field.farmName || "";
      const farmNumber = field.farmNumber || "";

      // ⛔ Omit test data
      const isTest =
        operator.toLowerCase().includes("test") ||
        farmName.toLowerCase().includes("test") ||
        farmNumber === "123";

      if (isTest) return;

      const cropData = field.crops?.[cropYear] || {};
      const farmKey = `${farmNumber}__${farmName}`;
      const tract = field.tractNumber || "—";

      if (!grouped[operator]) grouped[operator] = {};
      if (!grouped[operator][farmKey]) grouped[operator][farmKey] = {};
      if (!grouped[operator][farmKey][tract])
        grouped[operator][farmKey][tract] = [];

      grouped[operator][farmKey][tract].push({
        ...field,
        cropData,
      });
    });

    setGroupedFields(grouped);

    };

    fetchData();
  }, [cropYear]);
const handleExportCSV = () => {
  const rows = [
    [
      "Operator",
      "Farm #",
      "Tract #",
      "FSA Field #",
      "Field Name",
      "Assigned Crop",
      "Outcome",
      "FSA Acres",
      "Planting Date",
      "County",
      "Rent Shares",
    ],
  ];

  Object.entries(groupedFields).forEach(([operator, farms]) => {
    Object.entries(farms).forEach(([farmKey, tracts]) => {
      const [farmNumber, farmName] = farmKey.split("__");

      Object.entries(tracts).forEach(([tractNumber, fields]) => {
        fields.forEach((field) => {
          const plantingJobs = jobs
            .filter(
              (j) =>
                j.fieldId === field.id &&
                j.cropYear === cropYear &&
                j.jobType?.parentName === "Seeding" &&
                !["Seed and Pack", "Pack"].includes(j.jobType?.name || "")
            )
            .sort((a, b) => new Date(a.jobDate) - new Date(b.jobDate));

          const plantingDate =
            plantingJobs.length > 0
              ? format(parseISO(plantingJobs[0].jobDate), "MM-dd-yyyy")
              : "—";

          const rentShares = [
            {
              name: operator,
              share: field.operatorRentShare || 0,
            },
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

          const rentSharesString = rentShares
            .map((r) => `${r.name} (${r.share}%)`)
            .join("; ");

          rows.push([
            operator,
            farmNumber,
            tractNumber,
            field.fsaFieldNumber || "—",
            field.fieldName || "—",
            field.cropData?.crop || "—",
            field.cropData?.outcome || "—",
            field.fsaAcres || "—",
            plantingDate,
            field.county || "—",
            rentSharesString,
          ]);
        });
      });

      // ⬇️ Insert farm-level summary after each farm
      rows.push([]);
      rows.push([
        `Farm ${farmNumber} (${farmName}) – Total FSA Acres by Crop & Outcome:`,
      ]);

      summarizeByCropAndOutcome(Object.values(tracts).flat()).forEach(
        (item) => {
          rows.push([
            "",
            "",
            "",
            "",
            "",
            item.crop,
            item.outcome,
            item.acres.toFixed(2),
          ]);
        }
      );

      rows.push([]);
    });
  });

  // ⬇️ Final grand total summary at bottom of CSV
  rows.push([]);
  rows.push(["Grand Total – FSA Acres by Operator, County, Crop & Outcome:"]);

  Object.entries(summarizeAllByOperatorCounty(fields, cropYear))
    .sort(([aKey], [bKey]) => {
      const [aOperator] = aKey.split("__");
      const [bOperator] = bKey.split("__");

      if (aOperator === "Prairie City Farm") return -1;
      if (bOperator === "Prairie City Farm") return 1;
      if (aOperator === "Tri-County Farm") return -1;
      if (bOperator === "Tri-County Farm") return 1;

      return aOperator.localeCompare(bOperator);
    })
    .forEach(([opKey, crops]) => {
      const [operator, county] = opKey.split("__");
      rows.push([]);
      rows.push([`${operator} – ${county}`]);

      Object.values(crops).forEach((item) => {
        rows.push([
          "",
          "",
          "",
          "",
          "",
          item.crop,
          item.outcome,
          item.acres.toFixed(2),
        ]);
      });
    });

  const csvContent = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `FSA_Planting_Report_${cropYear}.csv`);

};

const summarizeByCropAndOutcome = (fields) => {
  const summary = {};

  fields.forEach((field) => {
    const crop = field.cropData?.crop || "—";
    const outcome = field.cropData?.outcome || "—";
    const key = `${crop}__${outcome}`;
    const acres = Number(field.fsaAcres || 0);

    if (!summary[key]) {
      summary[key] = { crop, outcome, acres: 0 };
    }

    summary[key].acres += acres;
  });

  return Object.values(summary);
};

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">
        📋 FSA Planting Date Report – {cropYear}
      </h1>
      <button
        onClick={handleExportCSV}
        className="bg-green-600 text-white px-4 py-2 rounded shadow text-sm mb-6 no-print"
      >
        ⬇️ Export CSV
      </button>

      {Object.entries(groupedFields).map(([operator, farms]) => (
        <div key={operator} className="mb-10">
          <h2 className="text-lg font-bold text-blue-700 mb-4">{operator}</h2>

          {Object.entries(farms).map(([farmKey, tracts]) => {
            const [farmNumber, farmName] = farmKey.split("__");
            return (
              <div key={farmKey} className="mb-6">
                <h3 className="text-md font-semibold text-gray-800 mb-2">
                  Farm {farmNumber} ({farmName})
                </h3>

                {Object.entries(tracts).map(([tractNumber, fields]) => (
                  <div key={tractNumber} className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-600 mb-1">
                      Tract {tractNumber}
                    </h4>

                    <table className="w-full text-sm border mb-3">
                      <thead className="bg-gray-100 text-left">
                        <tr>
                          <th className="p-2 border">FSA Field #</th>
                          <th className="p-2 border">Assigned Crop</th>
                          <th className="p-2 border">Outcome</th>
                          <th className="p-2 border">FSA Acres</th>
                          <th className="p-2 border">Planting Date</th>
                          <th className="p-2 border">Rent Shares</th>
                          <th className="p-2 border">County</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((field) => {
                          const plantingJobs = jobs
                            .filter(
                              (j) =>
                                j.fieldId === field.id &&
                                j.cropYear === cropYear &&
                                j.jobType?.parentName === "Seeding" &&
                                !["Seed and Pack", "Pack"].includes(
                                  j.jobType?.name || ""
                                )
                            )
                            .sort(
                              (a, b) =>
                                new Date(a.jobDate) - new Date(b.jobDate)
                            );

                          const plantingDate =
                            plantingJobs.length > 0
                              ? format(
                                  parseISO(plantingJobs[0].jobDate),
                                  "MM-dd-yyyy"
                                )
                              : "—";

                          const rentShares = [
                            {
                              name: operator,
                              share: field.operatorRentShare || 0,
                            },
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

                          return (
                            <tr key={field.id}>
                              <td className="border p-2">
                                <div>{field.fsaFieldNumber || "—"}</div>
                                <div className="text-xs italic text-gray-500">
                                  {field.fieldName || "—"}
                                </div>
                              </td>

                              <td className="border p-2">
                                {field.cropData?.crop || "—"}
                              </td>
                              <td className="border p-2">
                                {field.cropData?.outcome || "—"}
                              </td>
                              <td className="border p-2">
                                {field.fsaAcres || "—"}
                              </td>
                              <td className="border p-2">{plantingDate}</td>
                              <td className="border p-2">
                                <div className="space-y-1">
                                  {rentShares.map((r, i) => (
                                    <div
                                      key={i}
                                      className="flex justify-between gap-2"
                                    >
                                      <span>{r.name}</span>
                                      <span className="text-right">
                                        {r.share}%
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="border p-2">
                                {field.county || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
                {/* Farm-level crop summary */}
                <div className="mt-2 ml-2 text-sm text-gray-700">
                  <div className="font-semibold mb-1">
                    📊 Total FSA Acres by Crop & Outcome:
                  </div>
                  <ul className="list-disc pl-5">
                    {summarizeByCropAndOutcome(
                      Object.values(tracts).flat()
                    ).map((item, i) => (
                      <li key={i}>
                        {item.crop} – {item.outcome}: {item.acres.toFixed(2)}{" "}
                        acres
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      {/* Report-wide totals */}
      <div className="mt-12">
        <h2 className="text-lg font-bold text-blue-700 mb-4">
          📈 Total FSA Acres by Operator, County, Crop & Outcome
        </h2>
        {Object.entries(summarizeAllByOperatorCounty(fields, cropYear))
          .sort(([aKey], [bKey]) => {
            const [aOperator] = aKey.split("__");
            const [bOperator] = bKey.split("__");

            if (aOperator === "Prairie City Farm") return -1;
            if (bOperator === "Prairie City Farm") return 1;
            if (aOperator === "Tri-County Farm") return -1;
            if (bOperator === "Tri-County Farm") return 1;

            return aOperator.localeCompare(bOperator);
          })
          .map(([opKey, crops]) => {
            const [operator, county] = opKey.split("__");

            return (
              <div key={opKey} className="mb-6">
                <div className="font-semibold text-gray-800 mb-1">
                  {operator} – {county}
                </div>
                <ul className="list-disc pl-5 text-sm text-gray-700">
                  {Object.values(crops).map((item, i) => (
                    <li key={i}>
                      {item.crop} – {item.outcome}: {item.acres.toFixed(2)}{" "}
                      acres
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
      </div>
    </div>
  );
}
