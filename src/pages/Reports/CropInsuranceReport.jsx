// src/pages/Reports/CropInsuranceReport.jsx
import React, { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { useEffect, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { CropYearContext } from "@/context/CropYearContext";
import { useContext } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// tailwind-preserve
const __pdfExportHack = [
  "pdf-export",
  "pdf-export .operator-summary",
  "pdf-export .farm-block",
  "pdf-export .font-mono",
  "pdf-export .text-sm",
  "pdf-export .text-xs",
];

const resolveCropKey = (crop = "") => {
  const lower = crop.toLowerCase();
  if (lower.includes("long grain")) return "LGR";
  if (lower.includes("medium grain")) return "MGR";
  if (lower.includes("soybean")) return "SOYBEAN";
  if (lower.includes("prevented")) return "PP";
  if (lower.includes("fallow")) return "FALLOW";
  if (lower.includes("idle")) return "IDLE";
  return "OTHER";
};
const formatValue = (val) =>
  !val || isNaN(val) || val === 0 ? "—" : val.toFixed(2);

const cropDisplayName = {
  LGR: "Long Grain Rice",
  MGR: "Medium Grain Rice",
  SOYBEAN: "Soybeans",
  PP: "Prevented Planting",
  FALLOW: "Fallow",
  IDLE: "Idle",
};


export default function CropInsuranceReport() {
  const [viewMode, setViewMode] = useState("planted"); // or "planned"
  const [eligibleByCounty, setEligibleByCounty] = useState({
    TCF: {},
    PCF: {},
  });
  const { cropYear } = useContext(CropYearContext);
  const [fields, setFields] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [farmInputs, setFarmInputs] = useState({});
  // new shape: { [farmNumber]: { [cropKey]: { aph, coverage, price, ppFactor, premium } } }
  const [editingFarmCell, setEditingFarmCell] = useState(null);
  // shape: { farmNumber: "244", cropKey: "LGR", field: "aph" }
const [exportType, setExportType] = useState("operator"); // or "farm"
const [selectedValue, setSelectedValue] = useState("");


const updateFarmInput = async (
  farmNumber,
  county,
  operator,
  cropKey,
  field,
  value
) => {
  const groupKey = `${farmNumber}_${county}_${operator}`;
  const docRef = doc(db, "farmInsuranceSettings", `${cropYear}_${groupKey}`);

  // Get existing data from Firestore
  const docSnap = await getDoc(docRef);
  const existingData = docSnap.exists() ? docSnap.data() : {};

  const previousCrops = existingData.crops || {};

  const updatedCrops = {
    ...previousCrops,
    [cropKey]: {
      ...previousCrops[cropKey],
      [field]: value,
    },
  };

  await setDoc(docRef, {
    cropYear,
    groupKey,
    crops: updatedCrops,
  });

  // Update local state too
  setFarmInputs((prev) => ({
    ...prev,
    [groupKey]: updatedCrops,
  }));
};

  useEffect(() => {
    const fetchSavedFarmInputs = async () => {
      const snap = await getDocs(collection(db, "farmInsuranceSettings"));
      const result = {};

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.cropYear !== cropYear) return;

    const fullKey = docSnap.id; // uses ID like 2025_3650_Jackson_TCF
    result[fullKey] = data.crops || {};
  });


      setFarmInputs(result);
    };

    fetchSavedFarmInputs();
  }, [cropYear]);

  useEffect(() => {
    const fetchEligibleAcres = async () => {
      const snap = await getDocs(collection(db, "eligibleAcres"));
      const result = { TCF: {}, PCF: {} };

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.cropYear !== cropYear) return;

        const { operator, county, crops } = data;
        if (!result[operator][county]) result[operator][county] = {};
        result[operator][county] = crops;
      });

      setEligibleByCounty(result);
    };

    fetchEligibleAcres();
  }, [cropYear]);

  useEffect(() => {
    const fetchFields = async () => {
      const snapshot = await getDocs(collection(db, "fields"));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setFields(data);
    };
    fetchFields();
  }, []);
  const countyBreakdown = useMemo(() => {
    const result = { TCF: {}, PCF: {} };

    fields.forEach((field) => {
      if (!field.county || field.county.toLowerCase().includes("test county"))
        return;

      const cropInfo = field.crops?.[cropYear];
      if (!cropInfo) return;

      const cropType = resolveCropKey(cropInfo.crop);
      if (cropType === "OTHER") return;

      const planted = cropInfo.isPlanted !== false;
      const shouldInclude =
        viewMode === "planned" || (viewMode === "planted" && planted);
      if (!shouldInclude) return;

      const operator = field.operator?.includes("PCF") ? "PCF" : "TCF";
      const county = field.county;
      const fsa = field.fsaAcres;

      if (!result[operator][county]) result[operator][county] = {};
      if (!result[operator][county][cropType]) {
        result[operator][county][cropType] = 0;
      }

      result[operator][county][cropType] += fsa;
    });

    return result;
  }, [fields, cropYear, viewMode]);

  const plantedBreakdown = useMemo(() => {
    const result = { TCF: {}, PCF: {} };

    fields.forEach((field) => {
      if (!field.county || field.county.toLowerCase().includes("test county"))
        return;

      const cropInfo = field.crops?.[cropYear];
      if (!cropInfo?.isPlanted) return;

      const type = resolveCropKey(cropInfo.crop);
      const operator = field.operator?.includes("PCF") ? "PCF" : "TCF";
      const county = field.county;
      const fsa = field.fsaAcres;

      if (!result[operator][county]) result[operator][county] = {};
      if (!result[operator][county][type]) result[operator][county][type] = 0;

      result[operator][county][type] += fsa;
    });

    return result;
  }, [fields, cropYear]);

  const outcomeBreakdown = useMemo(() => {
    const result = { TCF: {}, PCF: {} };

    fields.forEach((field) => {
      if (!field.county || field.county.toLowerCase().includes("test county"))
        return;

      const cropInfo = field.crops?.[cropYear];
      if (!cropInfo) return;

      const operator = field.operator?.includes("PCF") ? "PCF" : "TCF";
      const county = field.county;
      const cropType = resolveCropKey(cropInfo.crop);
      const outcome = cropInfo.outcome || "unknown";
      const acres = field.fsaAcres || 0;

      if (!result[operator][county]) result[operator][county] = {};
      if (!result[operator][county][cropType])
        result[operator][county][cropType] = {
          planted: 0,
          prevented: 0,
          fallow: 0,
          unknown: 0,
        };

      if (outcome in result[operator][county][cropType]) {
        result[operator][county][cropType][outcome] += acres;
      } else {
        result[operator][county][cropType].unknown += acres;
      }
    });

    return result;
  }, [fields, cropYear]);

  const groupedByFarm = useMemo(() => {
    const result = {};

    fields.forEach((field) => {
      if (
        field.farmNumber === "123" ||
        String(field.farmNumber).trim() === "123"
      )
        return;

      const cropInfo = field.crops?.[cropYear];
      if (!cropInfo) return;

      const farmNumber = field.farmNumber || "Unknown";
      const county = field.county || "Unknown";
      const operator = field.operator?.includes("PCF") ? "PCF" : "TCF";

      const groupKey = `${farmNumber}_${county}_${operator}`;

      if (!result[groupKey]) {
        result[groupKey] = {
          farmNumber,
          county,
          operator,
          fields: [],
        };
      }

      result[groupKey].fields.push({
        id: field.id,
        fieldName: field.fieldName,
        tractNumber: field.tractNumber || "",
        fsaAcres: field.fsaAcres || 0,
        rentShare: field.operatorRentShare ?? 100,
        crop: cropInfo.crop || "Unassigned",
        outcome: cropInfo.outcome || "",
        isCompleted: cropInfo.isCompleted || false,
      });
    });

    return result;
  }, [fields, cropYear]);


const farmOptions = Object.keys(groupedByFarm).sort();
const operatorOptions = ["TCF", "PCF"];

const handleExportPDF = async () => {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });

  const allBlocks = Array.from(
    document.querySelectorAll(".operator-summary, .farm-block")
  );


  const blocksToExport = allBlocks.filter((el) => {
    if (exportType === "operator") {
      return el.dataset.operator === selectedValue;
    }
    if (exportType === "farm") {
      return el.dataset.farm === selectedValue;
    }
    return false;
  });

 document.body.classList.add("pdf-export");

 for (let i = 0; i < blocksToExport.length; i++) {
   const block = blocksToExport[i];

   // ✅ Force open <details> blocks so they are rendered
   if (block.tagName === "DETAILS") {
     block.open = true;
   }

   const canvas = await html2canvas(block);
   const imgData = canvas.toDataURL("image/png");

   const pdfWidth = pdf.internal.pageSize.getWidth();
   const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

   if (i > 0) pdf.addPage();
   pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
 }

 document.body.classList.remove("pdf-export");



  pdf.save(
    `crop-insurance-${
      exportType === "operator" ? selectedValue : "farm-" + selectedValue
    }.pdf`
  );
};

  const handleChange = async (operator, county, type, value) => {
    setEligibleByCounty((prev) => {
      const updated = {
        ...prev,
        [operator]: {
          ...prev[operator],
          [county]: {
            ...(prev[operator]?.[county] || {}),
            [type]: value,
          },
        },
      };

      // Save to Firestore
      const docId = `${cropYear}_${operator}_${county}`;
      const docRef = doc(db, "eligibleAcres", docId);
      const crops = updated[operator][county];

      setDoc(docRef, {
        cropYear,
        operator,
        county,
        crops,
      });

      return updated;
    });
  };
const sortedFarmGroups = Object.entries(groupedByFarm).sort(([, a], [, b]) => {
  if (a.operator === b.operator) {
    return parseInt(a.farmNumber) - parseInt(b.farmNumber);
  }
  return a.operator.localeCompare(b.operator);
});

console.log("📦 sortedFarmGroups", sortedFarmGroups);

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Crop Insurance Report" />

      {/* Toggle */}
      <div className="flex items-center justify-end mb-4 gap-2">
        <span className="text-sm text-gray-600">Viewing:</span>
        <button
          onClick={() => setViewMode("planted")}
          className={`px-3 py-1 rounded-full text-sm ${
            viewMode === "planted"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-800"
          }`}
        >
          Planted
        </button>
        <button
          onClick={() => setViewMode("planned")}
          className={`px-3 py-1 rounded-full text-sm ${
            viewMode === "planned"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-800"
          }`}
        >
          Planned
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <label className="text-sm font-medium">Export:</label>

        <select
          value={exportType}
          onChange={(e) => {
            setExportType(e.target.value);
            setSelectedValue(""); // reset selection
          }}
          className="border rounded px-3 py-1 text-sm"
        >
          <option value="operator">By Operator</option>
          <option value="farm">By Farm Number</option>
        </select>

        <select
          value={selectedValue}
          onChange={(e) => setSelectedValue(e.target.value)}
          className="border rounded px-3 py-1 text-sm"
        >
          <option value="">— Select —</option>
          {(exportType === "operator" ? operatorOptions : farmOptions).map(
            (opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            )
          )}
        </select>

        <button
          onClick={handleExportPDF}
          disabled={!selectedValue}
          className="bg-blue-600 text-white px-4 py-1.5 rounded shadow hover:bg-blue-700 disabled:opacity-50"
        >
          Export PDF
        </button>
      </div>

      {/* County tables per operator */}
      {["TCF", "PCF"].map((operator) => (
        <div className="operator-summary" data-operator={operator}>
          <Card key={operator} className="mb-6">
            <h2 className="text-blue-800 font-semibold text-sm mb-3">
              {operator} – County Eligibility
            </h2>
            <table className="w-full text-sm text-left">
              <thead className="text-gray-600 border-b">
                <tr>
                  <th className="py-1 pr-4">County</th>
                  <th className="py-1 pr-4">Max Eligible</th>
                  <th className="py-1 text-right">Intended Acres</th>
                  <th className="py-1 text-right">Planted</th>

                  <th className="py-1 text-right">Prevented</th>
                  <th className="py-1 text-right">Fallow</th>
                  <th className="py-1 text-right">Over / Under</th>
                </tr>
              </thead>
              <tbody className="text-gray-800">
                {Object.entries(countyBreakdown[operator]).map(
                  ([county, types]) => (
                    <>
                      <tr className="border-b font-semibold">
                        <td className="py-1 pr-4">{county}</td>
                        <td className="py-1 pr-4 text-gray-400 italic">—</td>
                        <td className="py-1 text-right text-gray-400 italic">
                          —
                        </td>
                      </tr>

                      {Object.entries(types).map(([type, assignedAcres]) => {
                        const outcomes = outcomeBreakdown?.[operator]?.[
                          county
                        ]?.[type] || {
                          planted: 0,
                          prevented: 0,
                          fallow: 0,
                        };

                        const planted = outcomes.planted || 0;
                        const prevented = outcomes.prevented || 0;
                        const fallow = outcomes.fallow || 0;

                        const max =
                          eligibleByCounty[operator]?.[county]?.[type];

                        const diff =
                          max != null && !isNaN(max)
                            ? max - (planted + prevented)
                            : null;

                        return (
                          <tr
                            key={`${county}_${type}`}
                            className="border-b text-gray-700"
                          >
                            <td className="py-1 pr-4 pl-4">
                              {cropDisplayName[type] || type}
                            </td>

                            {/* Max Eligible */}

                            <td className="py-1 pr-4">
                              {["LGR", "MGR", "SOYBEAN"].includes(type) ? (
                                editingCell?.operator === operator &&
                                editingCell?.county === county &&
                                editingCell?.type === type ? (
                                  <input
                                    type="number"
                                    autoFocus
                                    className="border rounded px-2 py-1 w-28"
                                    defaultValue={
                                      eligibleByCounty[operator]?.[county]?.[
                                        type
                                      ] ?? ""
                                    }
                                    onBlur={(e) => {
                                      handleChange(
                                        operator,
                                        county,
                                        type,
                                        parseFloat(e.target.value)
                                      );
                                      setEditingCell(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleChange(
                                          operator,
                                          county,
                                          type,
                                          parseFloat(e.target.value)
                                        );
                                        setEditingCell(null);
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="flex items-center gap-1 text-sm text-gray-700">
                                    <span className="font-mono">
                                      {eligibleByCounty[operator]?.[county]?.[
                                        type
                                      ]?.toFixed(2) ?? "—"}
                                    </span>
                                    <button
                                      className="text-blue-500 hover:underline text-xs"
                                      onClick={() =>
                                        setEditingCell({
                                          operator,
                                          county,
                                          type,
                                        })
                                      }
                                    >
                                      edit
                                    </button>
                                  </div>
                                )
                              ) : (
                                <span className="text-gray-400 italic">
                                  Auto (FSA)
                                </span>
                              )}
                            </td>

                            {/* Assigned Acres */}
                            <td className="py-1 text-right font-mono">
                              {assignedAcres?.toFixed(2) || "0.00"}
                            </td>
                        

                            {/* Planted */}
                            <td className="py-1 text-right font-mono">
                              {formatValue(planted)}
                            </td>

                            {/* Prevented */}
                            <td className="py-1 text-right font-mono">
                              {formatValue(prevented)}
                            </td>

                            {/* Fallow */}
                            <td className="py-1 text-right font-mono">
                              {formatValue(fallow)}
                            </td>

                            {/* Over / Under */}
                            <td className="py-1 text-right font-mono">
                              {diff == null ? (
                                "—"
                              ) : (
                                <span
                                  className={
                                    diff > 0
                                      ? "text-green-600"
                                      : diff < 0
                                      ? "text-red-600"
                                      : "text-gray-500"
                                  }
                                >
                                  {formatValue(diff)}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      <tr className="border-t font-semibold text-gray-700">
                        <td className="py-1 pr-4 pl-4" colSpan={2}>
                          → Total: {county} (
                          {(() => {
                            const countyFields = fields.filter(
                              (f) =>
                                f.operator?.includes(operator) &&
                                f.county === county &&
                                f.fsaAcres
                            );
                            const total = countyFields.reduce(
                              (sum, f) => sum + (f.fsaAcres || 0),
                              0
                            );
                            return `${total.toFixed(2)} FSA acres`;
                          })()}
                          )
                        </td>

                        {/* Assigned total */}
                        <td className="py-1 text-right font-mono">
                          {(() => {
                            let total = 0;
                            const cropEntries =
                              countyBreakdown[operator]?.[county] || {};
                            for (const val of Object.values(cropEntries)) {
                              if (!isNaN(val)) total += val;
                            }
                            return formatValue(total);
                          })()}
                        </td>

                     
                        {/* Planted total */}
                        <td className="py-1 text-right font-mono">
                          {(() => {
                            let total = 0;
                            const cropEntries =
                              outcomeBreakdown[operator]?.[county] || {};
                            for (const val of Object.values(cropEntries)) {
                              total += val.planted || 0;
                            }
                            return formatValue(total);
                          })()}
                        </td>

                        {/* Prevented total */}
                        <td className="py-1 text-right font-mono">
                          {(() => {
                            let total = 0;
                            const cropEntries =
                              outcomeBreakdown[operator]?.[county] || {};
                            for (const val of Object.values(cropEntries)) {
                              total += val.prevented || 0;
                            }
                            return formatValue(total);
                          })()}
                        </td>

                        {/* Fallow total */}
                        <td className="py-1 text-right font-mono">
                          {(() => {
                            let total = 0;
                            const cropEntries =
                              outcomeBreakdown[operator]?.[county] || {};
                            for (const val of Object.values(cropEntries)) {
                              total += val.fallow || 0;
                            }
                            return formatValue(total);
                          })()}
                        </td>

                        {/* Over/Under (usage) stays blank */}
                        <td className="py-1 text-right text-gray-400 italic">
                          —
                        </td>
                      </tr>
                    </>
                  )
                )}
              </tbody>
            </table>
          </Card>
        </div>
      ))}
      <Card className="mb-8">
        <h2 className="text-blue-800 font-semibold text-sm mb-3">
          Farm-Level Insurance Summary
        </h2>
        {sortedFarmGroups.map(([groupKey, group]) => {
          const farmNumber = group.farmNumber;

          return (
            <details
              key={`${group.farmNumber}_${group.county}_${group.operator}`}
              className="mb-6 border rounded-lg bg-white farm-block"
              data-operator={group.operator}
              data-farm={farmNumber}
            >
              <summary className="px-4 py-2 font-medium bg-gray-50 border-b">
                Farm {farmNumber} — {group.county} ({group.operator})
              </summary>

              <div className="p-4 space-y-4">
                {/* Editable Farm-Level Inputs per crop */}
                <div className="space-y-4">
                  {[...new Set(group.fields.map((f) => resolveCropKey(f.crop)))]
                    .filter((cropKey) => cropKey !== "FALLOW")
                    .map((cropKey) => {
                      const fullKey = `${cropYear}_${group.farmNumber}_${group.county}_${group.operator}`;

                      const inputs = farmInputs[fullKey]?.[cropKey] || {};

                      const aph = inputs.aph || "";
                      const avgRentShare = group.fields.length
                        ? group.fields.reduce(
                            (sum, f) => sum + (f.rentShare ?? 100),
                            0
                          ) / group.fields.length
                        : 100;

                      const coverage = parseFloat(inputs.coverage);
                      const price = inputs.price || "";
                      const ppFactor = inputs.ppFactor || "";
                      const premium = inputs.premium || "";

                    return (
                      <div
                        key={cropKey}
                        className="border rounded p-3 bg-gray-50"
                      >
                        <div className="text-sm font-semibold mb-2">
                          {cropDisplayName[cropKey]}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm items-end">
                          {/* APH */}
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              APH
                            </label>
                            {editingFarmCell?.groupKey === groupKey &&
                            editingFarmCell?.cropKey === cropKey &&
                            editingFarmCell?.field === "aph" ? (
                              <input
                                type="number"
                                autoFocus
                                className="w-full border rounded px-2 py-1"
                                defaultValue={aph}
                                onBlur={async (e) => {
                                  await updateFarmInput(
                                    group.farmNumber,
                                    group.county,
                                    group.operator,
                                    cropKey,
                                    "aph",
                                    parseFloat(e.target.value)
                                  );
                                  setEditingFarmCell(null);
                                }}
                                onKeyDown={async (e) => {
                                  if (e.key === "Enter") {
                                    await updateFarmInput(
                                      group.farmNumber,
                                      group.county,
                                      group.operator,
                                      cropKey,
                                      "aph",
                                      parseFloat(e.target.value)
                                    );
                                    setEditingFarmCell(null);
                                  }
                                }}
                              />
                            ) : (
                              <div className="flex items-center gap-1 text-sm text-gray-800">
                                <span className="font-mono">{aph || "—"}</span>
                                <button
                                  className="text-blue-500 hover:underline text-xs"
                                  onClick={() =>
                                    setEditingFarmCell({
                                      groupKey,
                                      cropKey,
                                      field: "aph",
                                    })
                                  }
                                >
                                  edit
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Coverage */}
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              % Coverage
                            </label>
                            {editingFarmCell?.groupKey === groupKey &&
                            editingFarmCell?.cropKey === cropKey &&
                            editingFarmCell?.field === "coverage" ? (
                              <input
                                type="number"
                                autoFocus
                                className="w-full border rounded px-2 py-1"
                                defaultValue={coverage}
                                onBlur={async (e) => {
                                  await updateFarmInput(
                                    group.farmNumber,
                                    group.county,
                                    group.operator,
                                    cropKey,
                                    "coverage",
                                    parseFloat(e.target.value)
                                  );
                                  setEditingFarmCell(null);
                                }}
                                onKeyDown={async (e) => {
                                  if (e.key === "Enter") {
                                    await updateFarmInput(
                                      group.farmNumber,
                                      group.county,
                                      group.operator,
                                      cropKey,
                                      "coverage",
                                      parseFloat(e.target.value)
                                    );
                                    setEditingFarmCell(null);
                                  }
                                }}
                              />
                            ) : (
                              <div className="flex items-center gap-1 text-sm text-gray-800">
                                <span className="font-mono">
                                  {coverage || "—"}
                                </span>
                                <button
                                  className="text-blue-500 hover:underline text-xs"
                                  onClick={() =>
                                    setEditingFarmCell({
                                      groupKey,
                                      cropKey,
                                      field: "coverage",
                                    })
                                  }
                                >
                                  edit
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Price */}
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Price ($/lb)
                            </label>
                            {editingFarmCell?.groupKey === groupKey &&
                            editingFarmCell?.cropKey === cropKey &&
                            editingFarmCell?.field === "price" ? (
                              <input
                                type="number"
                                autoFocus
                                className="w-full border rounded px-2 py-1"
                                defaultValue={price}
                                onBlur={async (e) => {
                                  await updateFarmInput(
                                    group.farmNumber,
                                    group.county,
                                    group.operator,
                                    cropKey,
                                    "price",
                                    parseFloat(e.target.value)
                                  );
                                  setEditingFarmCell(null);
                                }}
                                onKeyDown={async (e) => {
                                  if (e.key === "Enter") {
                                    await updateFarmInput(
                                      group.farmNumber,
                                      group.county,
                                      group.operator,
                                      cropKey,
                                      "price",
                                      parseFloat(e.target.value)
                                    );
                                    setEditingFarmCell(null);
                                  }
                                }}
                              />
                            ) : (
                              <div className="flex items-center gap-1 text-sm text-gray-800">
                                <span className="font-mono">
                                  {price || "—"}
                                </span>
                                <button
                                  className="text-blue-500 hover:underline text-xs"
                                  onClick={() =>
                                    setEditingFarmCell({
                                      groupKey,
                                      cropKey,
                                      field: "price",
                                    })
                                  }
                                >
                                  edit
                                </button>
                              </div>
                            )}
                          </div>

                          {/* PP Factor */}
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              PP Factor (%)
                            </label>
                            {editingFarmCell?.groupKey === groupKey &&
                            editingFarmCell?.cropKey === cropKey &&
                            editingFarmCell?.field === "ppFactor" ? (
                              <input
                                type="number"
                                autoFocus
                                className="w-full border rounded px-2 py-1"
                                defaultValue={ppFactor}
                                onBlur={async (e) => {
                                  await updateFarmInput(
                                    group.farmNumber,
                                    group.county,
                                    group.operator,
                                    cropKey,
                                    "ppFactor",
                                    parseFloat(e.target.value)
                                  );
                                  setEditingFarmCell(null);
                                }}
                                onKeyDown={async (e) => {
                                  if (e.key === "Enter") {
                                    await updateFarmInput(
                                      group.farmNumber,
                                      group.county,
                                      group.operator,
                                      cropKey,
                                      "ppFactor",
                                      parseFloat(e.target.value)
                                    );
                                    setEditingFarmCell(null);
                                  }
                                }}
                              />
                            ) : (
                              <div className="flex items-center gap-1 text-sm text-gray-800">
                                <span className="font-mono">
                                  {ppFactor || "—"}
                                </span>
                                <button
                                  className="text-blue-500 hover:underline text-xs"
                                  onClick={() =>
                                    setEditingFarmCell({
                                      groupKey,
                                      cropKey,
                                      field: "ppFactor",
                                    })
                                  }
                                >
                                  edit
                                </button>
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              PP $/ac:{" "}
                              {(() => {
                                const covNum = parseFloat(coverage);
                                const priceNum = parseFloat(price);
                                const factorNum = parseFloat(ppFactor);
                                if (
                                  isNaN(covNum) ||
                                  isNaN(priceNum) ||
                                  isNaN(factorNum)
                                )
                                  return "—";
                                const coveragePerAc =
                                  aph *
                                  (covNum / 100) *
                                  priceNum *
                                  (factorNum / 100);
                                return `$${coveragePerAc.toFixed(2)}`;
                              })()}
                            </div>
                          </div>

                          {/* Premium per Acre */}
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Premium per Acre
                            </label>
                            {editingFarmCell?.groupKey === groupKey &&
                            editingFarmCell?.cropKey === cropKey &&
                            editingFarmCell?.field === "premium" ? (
                              <input
                                type="number"
                                autoFocus
                                className="w-full border rounded px-2 py-1"
                                defaultValue={premium}
                                onBlur={async (e) => {
                                  await updateFarmInput(
                                    group.farmNumber,
                                    group.county,
                                    group.operator,
                                    cropKey,
                                    "premium",
                                    parseFloat(e.target.value)
                                  );
                                  setEditingFarmCell(null);
                                }}
                                onKeyDown={async (e) => {
                                  if (e.key === "Enter") {
                                    await updateFarmInput(
                                      group.farmNumber,
                                      group.county,
                                      group.operator,
                                      cropKey,
                                      "premium",
                                      parseFloat(e.target.value)
                                    );
                                    setEditingFarmCell(null);
                                  }
                                }}
                              />
                            ) : (
                              <div className="flex items-center gap-1 text-sm text-gray-800">
                                <span className="font-mono">
                                  {premium || "—"}
                                </span>
                                <button
                                  className="text-blue-500 hover:underline text-xs"
                                  onClick={() =>
                                    setEditingFarmCell({
                                      groupKey,
                                      cropKey,
                                      field: "premium",
                                    })
                                  }
                                >
                                  edit
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );

                    })}
                </div>

                {/* Fields Table */}
                <table className="w-full text-sm mt-4 mb-2">
                  <thead className="text-gray-600 border-b">
                    <tr>
                      <th className="py-1 text-left">Field</th>
                      <th className="py-1 text-left">Tract #</th>
                      <th className="py-1 text-right">Acres</th>
                      <th className="py-1 text-right">Rent %</th>
                      <th className="py-1 text-right">Effective Acres</th>
                      <th className="py-1 text-left">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-800">
                    {group.fields.map((f) => (
                      <tr key={f.id} className="border-b">
                        <td className="py-1 pr-2">{f.fieldName}</td>
                        <td className="py-1 pr-2">{f.tractNumber || "—"}</td>
                        <td className="py-1 text-right">
                          {f.fsaAcres?.toFixed(2)}
                        </td>
                        <td className="py-1 text-right">
                          {(f.rentShare ?? 100).toFixed(0)}%
                        </td>
                        <td className="py-1 text-right">
                          {((f.fsaAcres * (f.rentShare ?? 100)) / 100).toFixed(
                            2
                          )}
                        </td>
                        <td className="py-1 capitalize">{f.outcome || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Per-Crop Summary Block */}
                <div className="mt-4 border-t pt-3 text-sm space-y-4">
                  {[...new Set(group.fields.map((f) => resolveCropKey(f.crop)))]
                    .filter((cropKey) => cropKey !== "FALLOW")
                    .map((cropKey) => {
                      const fullKey = `${cropYear}_${group.farmNumber}_${group.county}_${group.operator}`;
                      const inputs = farmInputs[fullKey]?.[cropKey] || {};
                      const aph = inputs.aph || 0;
                      const cov = inputs.coverage || 0;
                      const price = inputs.price || 0;
                      const ppFactor = inputs.ppFactor || 0;
                      const premPerAc = inputs.premium || 0;

                      const effectiveInsuredAcres = group.fields
                        .filter(
                          (f) =>
                            resolveCropKey(f.crop) === cropKey &&
                            (f.outcome === "planted" ||
                              f.outcome === "prevented")
                        )
                        .reduce(
                          (sum, f) =>
                            sum +
                            (f.fsaAcres || 0) * ((f.rentShare ?? 100) / 100),
                          0
                        );

                      const effectivePPAcres = group.fields
                        .filter(
                          (f) =>
                            resolveCropKey(f.crop) === cropKey &&
                            f.outcome === "prevented"
                        )
                        .reduce(
                          (sum, f) =>
                            sum +
                            (f.fsaAcres || 0) * ((f.rentShare ?? 100) / 100),
                          0
                        );

                      const avgRentShare = group.fields.length
                        ? group.fields.reduce(
                            (sum, f) => sum + (f.rentShare ?? 100),
                            0
                          ) / group.fields.length
                        : 100;

                      const coverage = aph * (cov / 100) * price;
                      const ppPay =
                        effectivePPAcres * coverage * (ppFactor / 100);
                      const premium = effectiveInsuredAcres * premPerAc;
                      const net = ppPay - premium;

                    return (
                      <div
                        key={cropKey}
                        className="border rounded p-3 bg-white shadow-sm"
                      >
                        <div className="text-sm font-semibold mb-2">
                          {cropDisplayName[cropKey]}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <span className="text-gray-600">
                              Insured Acres (Planted + PP):{" "}
                            </span>
                            <span className="font-mono">
                              {formatValue(effectiveInsuredAcres)}{" "}
                              {effectiveInsuredAcres ? (
                                <span className="text-gray-500 text-xs">
                                  (
                                  {formatValue(
                                    effectiveInsuredAcres / (avgRentShare / 100)
                                  )}{" "}
                                  100%)
                                </span>
                              ) : null}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">
                              Coverage $/ac:{" "}
                            </span>
                            <span className="font-mono">
                              {formatValue(coverage * (avgRentShare / 100))}{" "}
                              {coverage ? (
                                <span className="text-gray-500 text-xs">
                                  ({formatValue(coverage)} 100%)
                                </span>
                              ) : null}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">
                              PP Acres Only:{" "}
                            </span>
                            <span className="font-mono">
                              {formatValue(effectivePPAcres)}{" "}
                              {effectivePPAcres ? (
                                <span className="text-gray-500 text-xs">
                                  (
                                  {formatValue(
                                    effectivePPAcres / (avgRentShare / 100)
                                  )}{" "}
                                  100%)
                                </span>
                              ) : null}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">PP $/ac: </span>
                            <span className="font-mono">
                              {formatValue(
                                coverage *
                                  (ppFactor / 100) *
                                  (avgRentShare / 100)
                              )}{" "}
                              {coverage && ppFactor ? (
                                <span className="text-gray-500 text-xs">
                                  ({formatValue(coverage * (ppFactor / 100))}{" "}
                                  100%)
                                </span>
                              ) : null}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">
                              Total PP Payment:{" "}
                            </span>
                            <span className="font-mono">
                              {formatValue(ppPay)}{" "}
                              {ppPay ? (
                                <span className="text-gray-500 text-xs">
                                  ({formatValue(ppPay / (avgRentShare / 100))}{" "}
                                  100%)
                                </span>
                              ) : null}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">
                              Total Premium:{" "}
                            </span>
                            <span className="font-mono">
                              {formatValue(premium)}{" "}
                              {premium ? (
                                <span className="text-gray-500 text-xs">
                                  ({formatValue(premium / (avgRentShare / 100))}{" "}
                                  100%)
                                </span>
                              ) : null}
                            </span>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-gray-600">Net Return: </span>
                            <span
                              className={`font-mono font-bold ${
                                net > 0
                                  ? "text-green-600"
                                  : net < 0
                                  ? "text-red-600"
                                  : "text-gray-500"
                              }`}
                            >
                              {formatValue(net)}{" "}
                              {net ? (
                                <span className="text-gray-500 text-xs font-normal">
                                  ({formatValue(net / (avgRentShare / 100))}{" "}
                                  100%)
                                </span>
                              ) : null}
                            </span>
                          </div>
                        </div>
                      </div>
                    );

                    })}
                </div>
              </div>
            </details>
          );
        })}
      </Card>
    </div>
  );
}
