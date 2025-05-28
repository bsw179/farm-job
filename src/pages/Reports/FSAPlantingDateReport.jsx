// src/pages/Reports/FsaPlantingDateReport.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { useCropYear } from "@/context/CropYearContext";

export default function FsaPlantingDateReport() {
  const { cropYear } = useCropYear();
  const [fields, setFields] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [groupedFields, setGroupedFields] = useState({});

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
        const cropData = field.crops?.[cropYear] || {};
        const operator = field.operator || "Unknown Operator";
        const farmKey = `${field.farmNumber}__${field.farmName || ""}`;
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

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">
        📋 FSA Planting Date Report – {cropYear}
      </h1>

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
                              ? new Date(
                                  plantingJobs[0].jobDate
                                ).toLocaleDateString()
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
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
