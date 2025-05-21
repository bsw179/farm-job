// 🔹 JobCard.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import { getJobTypeIcon } from "@/utils/getJobTypeIcon";
import { useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/firebase";
import { Pencil, Trash2, FileText } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useState } from "react";
import { Dialog } from "@headlessui/react";

export default function JobCard({
  job,
  isFieldJob,
  onSelect,
  onDelete,
  onStatusChange,
}) {
  const navigate = useNavigate();
  const { role } = useUser();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const getJobTypeName = (job) =>
    typeof job.jobType === "string" ? job.jobType : job.jobType?.name || "";

  const formatShortDate = (isoString) => {
    if (!isoString) return "—";
    const [year, month, day] = isoString.split("-");
    const localDate = new Date(Number(year), Number(month) - 1, Number(day));
    return localDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };
async function handleDownloadPDF(job) {
  try {
    
    const { generateBatchPDF } = await import("@/utils/generatePDF");
    const fieldRef = doc(db, "fields", job.fieldId);
    const fieldSnap = await getDoc(fieldRef);
    const fieldData = fieldSnap.exists() ? fieldSnap.data() : null;

    if (!fieldData) {
      alert("Field data missing — can't generate PDF.");
      return;
    }

    const isLeveeJob =
      (job.jobType?.name || "").toLowerCase().includes("levee") ||
      (job.jobType?.name || "").toLowerCase().includes("pack");

    const crop = job.crop || fieldData?.crops?.[job.cropYear]?.crop || "";
    const isRice = crop.toLowerCase().includes("rice");
    const isSoy = crop.toLowerCase().includes("soybean");

    let acres = job.drawnAcres ?? job.acres ?? fieldData.gpsAcres ?? 0;
    if (isLeveeJob) {
      if (isRice && fieldData.riceLeveeAcres)
        acres = parseFloat(fieldData.riceLeveeAcres);
      if (isSoy && fieldData.beanLeveeAcres)
        acres = parseFloat(fieldData.beanLeveeAcres);
    }

   const enrichedJob = {
     ...job,
     fields: [
       {
         id: job.fieldId,
         fieldName: fieldData.fieldName || "",
         operator: fieldData.operator || "",
         landowner: fieldData.landowner || "",
         operatorExpenseShare: fieldData.operatorExpenseShare ?? 0,
         landownerExpenseShare: fieldData.landownerExpenseShare ?? 0,
         acres,
         imageBase64: null,
       },
     ],
   };

console.log("🧾 Enriched field payload for PDF:", {
  operator: fieldData.operator,
  landowner: fieldData.landowner,
  operatorExpenseShare: fieldData.operatorExpenseShare,
  landownerExpenseShare: fieldData.landownerExpenseShare,
});

    const blob = await generateBatchPDF([enrichedJob]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Job_${job.fieldName || job.id}.pdf`;
    a.click();
  } catch (err) {
    console.error("PDF generation failed", err);
    alert("Failed to generate PDF.");
  }
}


  return (
    <div
      className="border rounded shadow-sm p-4 cursor-pointer hover:shadow-md transition"
      onClick={() => onSelect(job)}
    >
      {/* 📋 Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm font-semibold text-blue-700 flex items-center gap-1">
            <img
              src={
                job.jobType?.icon
                  ? `/icons/${job.jobType.icon}.svg`
                  : getJobTypeIcon(getJobTypeName(job))
              }
              alt={job.jobType?.icon || getJobTypeName(job)}
              className="w-12 h-12 inline-block"
            />

            {getJobTypeName(job)}
          </div>

          <div className="text-xs text-gray-500 leading-tight">
            {job.cropYear} •{" "}
            {isFieldJob
              ? job.fieldName
              : [...new Set(job.fields?.map((f) => f.fieldName))].join(", ")}
            <br />
            {formatShortDate(job.jobDate)}
          </div>
          {job.jobType?.parentName === "Spraying" && job.waterVolume && (
            <>
              <br />
              <span className="text-[10px] text-gray-500">
                💧 Water Volume: {job.waterVolume} gal/acre
              </span>
            </>
          )}

          {job.jobType?.parentName === "Tillage" && job.passes && (
            <>
              <br />
              <span className="text-[10px] text-gray-500">
                🚜 Passes: {job.passes}
              </span>
            </>
          )}
        </div>
        {job.jobType?.parentName === "Spraying" && job.waterVolume && (
          <>
            <br />
            <span className="text-[10px] text-gray-500">
              💧 Water Volume: {job.waterVolume} gal/acre
            </span>
          </>
        )}

        {job.jobType?.parentName === "Tillage" && job.passes && (
          <>
            <br />
            <span className="text-[10px] text-gray-500">
              🚜 Passes: {job.passes}
            </span>
          </>
        )}

        {/* 🛠 Actions */}
        {role !== "viewer" && (
          <div className="flex gap-2">
            <span title="Change Status">
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isFieldJob) {
                    setShowStatusModal(true);
                  }
                }}
              >
                <span role="img" aria-label="status">
                  📍
                </span>
              </Button>
            </span>

            <span title="Edit Job">
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(job);
                  window.dispatchEvent(new CustomEvent("open-job-editor"));
                }}
              >
                <Pencil size={16} />
              </Button>
            </span>

            <span title="Delete Job">
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  const confirmDelete = window.confirm(
                    `Are you sure you want to delete this job?`
                  );
                  if (confirmDelete) {
                    onDelete(job.id, isFieldJob);
                  }
                }}
              >
                <Trash2 size={16} />
              </Button>
            </span>

            <span title="Generate PDF">
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadPDF(job);
                }}
              >
                <FileText size={16} />
              </Button>
            </span>
          </div>
        )}
      </div>

      {/* 🟦 Card Content */}
      {Array.isArray(job.products) && job.products.length > 0 && (
        <ul className="text-sm text-gray-600 mt-2 space-y-0.5 list-disc list-inside">
          {job.products.map((p, i) => (
            <li key={i}>
              {p.productName || p.name || "—"} • {p.rate || ""} {p.unit || ""}
            </li>
          ))}
        </ul>
      )}

      {/* 🏷️ Badges and Acres */}
      <div className="flex flex-col gap-0.5 text-xs text-gray-500 mt-2">
        <div className="flex items-center gap-2">
          <Badge variant={job.status?.toLowerCase()}>{job.status}</Badge>

          {job.linkedToJobId && <Badge variant="outline">🔗 Grouped</Badge>}
        </div>

        <div className="text-xs text-gray-500">
          {(() => {
            const isLeveeJob =
              (job.jobType?.name || "").toLowerCase().includes("levee") ||
              (job.jobType?.name || "").toLowerCase().includes("pack");

            const crop = job.crop || "";

            if (isLeveeJob && Array.isArray(job.fields)) {
              let total = 0;
              job.fields.forEach((f) => {
                const crop = f.crop || f.crops?.[job.cropYear]?.crop || "";
                if (crop.includes("Rice"))
                  total += parseFloat(f.riceLeveeAcres || 0);
                else if (crop.includes("Soybean"))
                  total += parseFloat(f.beanLeveeAcres || 0);
              });
              return `${total.toFixed(1)} acres (Levee)`;
            }

            if (Array.isArray(job.fields)) {
              const total = job.fields.reduce(
                (sum, f) => sum + (parseFloat(f.acres) || 0),
                0
              );
              return `${total.toFixed(2)} acres`;
            }

            return `${
              job.acres ?? job.drawnAcres ?? job.gpsAcres ?? "—"
            } acres`;
          })()}
        </div>
      </div>
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
              <h2 className="text-lg font-semibold mb-4">Update Job Status</h2>

              <div className="space-y-2 mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`status-${job.id}`}
                    value="Planned"
                    checked={job.status !== "Completed"}
                    onChange={async () => {
                      setStatusLoading(true);
                      try {
                        await setDoc(doc(db, "jobsByField", job.id), {
                          ...job,
                          status: "Planned",
                        });
                        onStatusChange?.(job.id, "Planned");
                        setShowStatusModal(false);
                      } catch (err) {
                        alert("Failed to update job status.");
                      }
                      setStatusLoading(false);
                    }}
                  />
                  Planned
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`status-${job.id}`}
                    value="Completed"
                    checked={job.status === "Completed"}
                    onChange={async () => {
                      setStatusLoading(true);
                      try {
                        const jobRef = doc(db, "jobsByField", job.id);
                        const jobSnap = await getDoc(jobRef);
                        const jobData = jobSnap.exists()
                          ? jobSnap.data()
                          : null;
                        if (!jobData) throw new Error("Job not found.");

                        // 👇 Detach logic
                        const detachedJob = {
                          ...jobData,
                          status: "Completed",
                          linkedToJobId: null,
                          isDetachedFromGroup: true,
                        };

                        const newRef = doc(collection(db, "jobsByField"));
                        await setDoc(newRef, {
                          ...detachedJob,
                          id: newRef.id,
                          timestamp: new Date().toISOString(),
                        });

                        // 👇 Remove old field job
                        await deleteDoc(jobRef);

                        // 👇 Update grouped job's field list
                        if (jobData.linkedToJobId) {
                          const groupRef = doc(
                            db,
                            "jobs",
                            jobData.linkedToJobId
                          );
                          const groupSnap = await getDoc(groupRef);
                          if (groupSnap.exists()) {
                            const group = groupSnap.data();
                            const remainingFields = (group.fields || []).filter(
                              (f) => f.id !== jobData.fieldId
                            );

                            if (remainingFields.length === 1) {
                              const lastFieldId =
                                remainingFields[0].fieldId ||
                                remainingFields[0].id;
                              const lastFieldRef = doc(
                                db,
                                "jobsByField",
                                `${jobData.linkedToJobId}_${lastFieldId}`
                              );
                              await updateDoc(lastFieldRef, {
                                linkedToJobId: null,
                                isDetachedFromGroup: true,
                              });
                              await deleteDoc(groupRef);
                              // 🔁 Also check if this was the last field-level job still linked
                              const q = query(
                                collection(db, "jobsByField"),
                                where(
                                  "linkedToJobId",
                                  "==",
                                  jobData.linkedToJobId
                                )
                              );
                              const snap = await getDocs(q);
                              if (snap.size === 1) {
                                const loneDoc = snap.docs[0];
                                await updateDoc(loneDoc.ref, {
                                  linkedToJobId: null,
                                  isDetachedFromGroup: true,
                                });
                              }
                            } else {
                              await setDoc(groupRef, {
                                ...group,
                                fields: remainingFields,
                              });
                            }
                          }
                        }

                        onStatusChange?.(job.id, "Completed");
                        setShowStatusModal(false);
                      } catch (err) {
                        console.error(err);
                        alert("Failed to detach and update job status.");
                      }
                      setStatusLoading(false);
                    }}
                  />
                  Completed
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
