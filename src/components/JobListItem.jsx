// 🔹 JobListItem.jsx
import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { getJobTypeIcon } from '@/utils/getJobTypeIcon';
import { useNavigate } from 'react-router-dom';
import { Menu } from '@headlessui/react';
import { MoreVertical } from 'lucide-react';
import { doc, getDoc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { useUser } from '@/context/UserContext';

export default function JobListItem({
  job,
  isFieldJob,
  onSelect,
  onDelete,
  selectedJobs,
  setSelectedJobs
}) {
  const navigate = useNavigate();
  const { role } = useUser();

  const getJobTypeName = (job) =>
    typeof job.jobType === 'string' ? job.jobType : job.jobType?.name || '';

  return (
    <div
      className="flex items-center justify-between px-2 py-2 hover:bg-gray-50 cursor-pointer"
      onClick={(e) => {
        const tag = e.target.tagName?.toLowerCase();
        const isInsideMenu = e.target.closest(".job-menu");
        if (tag === "input" || isInsideMenu) return;
        onSelect(job);
      }}
    >
      {/* ⬜ Checkbox */}
      <div className="flex items-center gap-3 text-sm whitespace-nowrap overflow-x-auto">
        {selectedJobs && setSelectedJobs && role !== "viewer" && (
          <input
            type="checkbox"
            checked={selectedJobs.includes(job.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedJobs((prev) => [...prev, job.id]);
              } else {
                setSelectedJobs((prev) => prev.filter((id) => id !== job.id));
              }
            }}
          />
        )}

        {/* 📅 Date */}
        <div>{job.jobDate || "—"}</div>

        {/* 🏷 Job Type */}
        <div className="text-gray-700 flex items-center gap-1">
          <img
            src={getJobTypeIcon(getJobTypeName(job))}
            alt={getJobTypeName(job)}
            className="w-5 h-5 inline-block"
          />
          {getJobTypeName(job)}
        </div>

        {/* 🌾 Field Name(s) */}
        <div>
          {isFieldJob
            ? job.fieldName
            : [
                ...new Set(
                  job.fields
                    ?.filter((f) => !f.isDetachedFromGroup)
                    .map((f) => f.fieldName)
                ),
              ].join(", ") || "—"}
        </div>

        {/* 📦 First Product */}
        <div>{job.products?.[0]?.productName || "—"}</div>

        {/* 📐 Acres + Passes */}
        <div className="flex flex-col text-xs">
          <div>
            {(() => {
              const isLeveeJob =
                (job.jobType?.name || "").toLowerCase().includes("levee") ||
                (job.jobType?.name || "").toLowerCase().includes("pack");

              if (isLeveeJob && Array.isArray(job.fields)) {
                let total = 0;
                job.fields.forEach((f) => {
                  const crop = f.crop || f.crops?.[job.cropYear]?.crop || "";
                  if (crop.includes("Rice"))
                    total += parseFloat(f.riceLeveeAcres || 0);
                  else if (crop.includes("Soybean"))
                    total += parseFloat(f.beanLeveeAcres || 0);
                });
                return `${total.toFixed(1)} ac (Levee)`;
              }

              if (isFieldJob) {
                return `${job.acres?.toFixed?.(1) || "—"} ac`;
              }

              if (isFieldJob) {
                return `${
                  job.acres?.toFixed?.(1) ||
                  job.drawnAcres?.toFixed?.(1) ||
                  job.gpsAcres?.toFixed?.(1) ||
                  "—"
                } ac`;
              }
            })()}
          </div>

          {job.jobType?.parentName === "Tillage" && job.passes && (
            <div>Passes: {job.passes}</div>
          )}
        </div>

        {/* 🏷 Status + Grouped badge */}
        <div className="flex items-center gap-2 text-xs">
          <Badge variant={job.status?.toLowerCase()}>{job.status}</Badge>
          {job.linkedToJobId && <Badge variant="outline">🔗 Grouped</Badge>}
        </div>
      </div>

      {/* ⚙️ 3-dot menu */}
      {role !== "viewer" && (
        <div className="job-menu relative">
          <Menu>
            <Menu.Button className="text-gray-500 hover:text-gray-700">
              <MoreVertical size={18} />
            </Menu.Button>
            <Menu.Items className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-md z-50">
              {/* ✏️ Edit */}
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`block w-full px-4 py-2 text-sm text-left ${
                      active ? "bg-gray-100" : ""
                    }`}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      try {
                        if (isFieldJob) {
                          navigate(`/jobs/field/${job.id}`);
                        } else {
                          const snap = await getDocs(
                            query(
                              collection(db, "jobsByField"),
                              where("linkedToJobId", "==", job.id)
                            )
                          );

                          const freshFields = snap.docs
                            .map((doc) => ({ id: doc.id, ...doc.data() }))
                            .filter((f) => !f.isDetachedFromGroup);

                          if (!freshFields.length) {
                            alert("No fields found for this grouped job.");
                            return;
                          }

                          navigate("/jobs/summary", {
                            state: {
                              isEditing: true,
                              jobId: job.id,
                              jobType: job.jobType,
                              jobDate: job.jobDate,
                              vendor: job.vendor,
                              applicator: job.applicator,
                              products: job.products,
                              selectedFields: freshFields,
                              cropYear: job.cropYear,
                              notes: job.notes || "",
                              passes: job.passes || 1,
                              waterVolume: job.waterVolume || "",
                            },
                          });
                        }
                      } catch (error) {
                        console.error(
                          "❌ Failed to load grouped fields:",
                          error
                        );
                        alert(
                          "Something went wrong loading fields. Try again."
                        );
                      }
                    }}
                  >
                    ✏️ Edit
                  </button>
                )}
              </Menu.Item>

              {/* 🗑️ Delete */}
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`block w-full px-4 py-2 text-sm text-left ${
                      active ? "bg-gray-100" : ""
                    }`}
                    onClick={() => {
                      const confirmDelete = window.confirm(
                        "Are you sure you want to delete this job?"
                      );
                      if (confirmDelete) {
                        onDelete(job.id, isFieldJob);
                      }
                    }}
                  >
                    🗑️ Delete
                  </button>
                )}
              </Menu.Item>

              {/* 🔁 Toggle Status */}
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`block w-full px-4 py-2 text-sm text-left ${
                      active ? "bg-gray-100" : ""
                    }`}
                    onClick={async () => {
                      const newStatus =
                        job.status === "Planned" ? "Completed" : "Planned";

                      if (isFieldJob) {
                        const ref = doc(db, "jobsByField", job.id);
                        await setDoc(
                          ref,
                          { ...job, status: newStatus },
                          { merge: true }
                        );
                      } else {
                        const ref = doc(db, "jobs", job.id);
                        await setDoc(
                          ref,
                          { ...job, status: newStatus },
                          { merge: true }
                        );
                      }
                    }}
                  >
                    {job.status === "Planned"
                      ? "✔️ Mark as Completed"
                      : "↩️ Mark as Planned"}
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Menu>
        </div>
      )}
    </div>
  );
}
