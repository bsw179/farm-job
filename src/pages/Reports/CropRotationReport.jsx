import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useCropYear } from "../../context/CropYearContext";

function getRotationDisplay(field, year) {
  const entry = field?.crops?.[year];
  if (!entry) {
    return {
      label: "—",
      icon: "⬜",
      className: "bg-gray-100 text-gray-500",
    };
  }

  if (entry.isCompleted !== true) {
    return {
      label: "—",
      icon: "⬜",
      className: "bg-gray-100 text-gray-500",
    };
  }

  if (entry.outcome === "prevented") {
    return {
      label: "Prevented Planting",
      icon: "🟣",
      className: "bg-purple-100 text-purple-700",
    };
  }

  if (entry.outcome === "fallow") {
    return {
      label: "Fallow / Idle",
      icon: "🟤",
      className: "bg-stone-100 text-stone-700",
    };
  }

  const crop = entry.crop || "—";

  if (entry.outcome === "planted") {
    if (crop.toLowerCase().includes("rice")) {
      return {
        label: crop,
        icon: "🌾",
        className: "bg-yellow-100 text-yellow-800",
      };
    }

    if (crop.toLowerCase().includes("soy")) {
      return {
        label: crop,
        icon: "🫘",
        className: "bg-green-100 text-green-700",
      };
    }

    return {
      label: crop,
      icon: "🌱",
      className: "bg-blue-100 text-blue-700",
    };
  }

  return {
    label: crop,
    icon: "🌱",
    className: "bg-blue-100 text-blue-700",
  };
}

export default function CropRotationReport() {
  const { cropYear } = useCropYear();
  const [fields, setFields] = useState({});
  const [sortKey, setSortKey] = useState("Farm");

  useEffect(() => {
    const fetchData = async () => {
      const fieldSnap = await getDocs(collection(db, "fields"));

      const fieldMap = {};
      fieldSnap.docs.forEach((doc) => {
        fieldMap[doc.id] = { id: doc.id, ...doc.data() };
      });

      setFields(fieldMap);
    };

    fetchData();
  }, []);

  const [yearsBack, setYearsBack] = useState(2);

  const yearList = Array.from(
    { length: yearsBack },
    (_, i) => Number(cropYear) - i,
  );

  const rows = useMemo(() => {
    return Object.values(fields).map((field) => {
      const yearData = {};

     yearList.forEach((year) => {
       yearData[year] = getRotationDisplay(field, year);
     });

      return {
        farm: field.farmName || "—",
        field: field.fieldName || "—",
        acres: field.gpsAcres || "—",
        ...yearData,
      };
    });
  }, [fields, cropYear, yearsBack]);

  const sortedRows = [...rows].sort((a, b) => {
    if (sortKey === "Farm") {
      return a.farm === b.farm
        ? a.field.localeCompare(b.field)
        : a.farm.localeCompare(b.farm);
    }
    if (sortKey === "Field") return a.field.localeCompare(b.field);
    if (sortKey === "Acres") return Number(a.acres || 0) - Number(b.acres || 0);
    if (sortKey === "Current") return a.current.localeCompare(b.current);
    if (sortKey === "Previous") return a.previous.localeCompare(b.previous);
    return 0;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold">Crop Rotation Report</h1>

      <div className="flex gap-4 flex-wrap items-center">
        <div className="flex gap-2 flex-wrap">
          {["Farm", "Field", "Acres"].map((key) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={`px-3 py-1 border rounded ${
                sortKey === key ? "bg-blue-600 text-white" : "bg-white"
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold">Show:</label>
          <select
            value={yearsBack}
            onChange={(e) => setYearsBack(Number(e.target.value))}
            className="border px-2 py-1 rounded"
          >
            <option value={2}>Last 2 Years</option>
            <option value={3}>Last 3 Years</option>
            <option value={4}>Last 4 Years</option>
            <option value={5}>Last 5 Years</option>
          </select>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">Farm</th>
              <th className="border px-2 py-1">Field</th>
              <th className="border px-2 py-1">Acres</th>
              {yearList.map((year) => (
                <th key={year} className="border px-2 py-1">
                  {year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={`${row.farm}-${row.field}`}>
                <td className="border px-2 py-1">{row.farm}</td>
                <td className="border px-2 py-1">{row.field}</td>
                <td className="border px-2 py-1 text-right">{row.acres}</td>
                {yearList.map((year) => (
                  <td key={year} className="border px-2 py-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${row[year].className}`}
                    >
                      <span>{row[year].icon}</span>
                      <span>{row[year].label}</span>
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
