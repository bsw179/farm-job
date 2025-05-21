// New clean version of Jobs.jsx

import React, { useState, useEffect, useContext } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { CropYearContext } from "@/context/CropYearContext";
import { useUser } from "@/context/UserContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs, Tab } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Menu } from "@headlessui/react";
import { Plus } from "lucide-react";
import JobCard from "@/components/JobCard";
import JobDetailsModal from "@/components/JobDetailsModal";
import JobEditorModal from "@/components/JobEditorModal";


function DropdownFilter({ label, selected, setSelected, options }) {
  const uniqueSorted = [...new Set(options)].filter(Boolean).sort();
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="border rounded p-2 min-h-[40px]">
        <div className="flex flex-wrap gap-1">
          {selected.map((val) => (
            <span
              key={val}
              className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs flex items-center gap-1"
            >
              {val}
              <button
                onClick={() =>
                  setSelected((prev) => prev.filter((v) => v !== val))
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <select
          value=""
          onChange={(e) => {
            const val = e.target.value;
            if (val && !selected.includes(val)) {
              setSelected((prev) => [...prev, val]);
            }
          }}
          className="w-full mt-2 border px-2 py-1 rounded text-sm"
        >
          <option value="">Select...</option>
          {uniqueSorted.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function Jobs() {
  const { cropYear } = useContext(CropYearContext);
  const { role, loading } = useUser();
  const [fieldJobs, setFieldJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [showJobModal, setShowJobModal] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [sortKey, setSortKey] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterFields, setFilterFields] = useState([]);
  const [filterProducts, setFilterProducts] = useState([]);
  const [filterJobTypes, setFilterJobTypes] = useState([]);
  const [filterVendors, setFilterVendors] = useState([]);
  const [filterApplicators, setFilterApplicators] = useState([]);
  const [filterFarms, setFilterFarms] = useState([]);
  const [filterLandowners, setFilterLandowners] = useState([]);
  const [filterOperators, setFilterOperators] = useState([]);

  useEffect(() => {
    const fetchFieldJobs = async () => {
      const snap = await getDocs(collection(db, "jobsByField"));
      const jobs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setFieldJobs(jobs);
    };
    fetchFieldJobs();
  }, []);

  const getJobTypeName = (job) =>
    typeof job.jobType === "string" ? job.jobType : job.jobType?.name || "";

  const jobsToShow = fieldJobs
    .filter((j) => String(j.cropYear) === String(cropYear))

    .filter((j) => {
      const jobTypeName = getJobTypeName(j);

      const passesAllFilters =
        (filterFields.length === 0 || filterFields.includes(j.fieldName)) &&
        (filterProducts.length === 0 ||
          (j.products || []).some((p) =>
            filterProducts.includes(p.productName)
          )) &&
        (filterJobTypes.length === 0 || filterJobTypes.includes(jobTypeName)) &&
        (filterVendors.length === 0 ||
          (j.products || []).some((p) => filterVendors.includes(p.vendor))) &&
        (filterApplicators.length === 0 ||
          filterApplicators.includes(j.applicator)) &&
        (filterFarms.length === 0 || filterFarms.includes(j.farmName)) &&
        (filterLandowners.length === 0 ||
          filterLandowners.includes(j.landowner)) &&
        (filterOperators.length === 0 ||
          filterOperators.includes(j.operator)) &&
        (filterStatus === "All" || j.status === filterStatus) &&
        (filterType === "All" || jobTypeName === filterType);

      const matchesSearch =
        j.fieldName?.toLowerCase().includes(searchText.toLowerCase()) ||
        (j.products || []).some((p) =>
          p.productName?.toLowerCase().includes(searchText.toLowerCase())
        ) ||
        jobTypeName.toLowerCase().includes(searchText.toLowerCase());

      return passesAllFilters && matchesSearch;
    })

    .sort((a, b) => {
      if (sortKey === "date")
        return (
          (a.jobDate || "").localeCompare(b.jobDate || "") *
          (sortDirection === "asc" ? 1 : -1)
        );
      if (sortKey === "type")
        return (
          getJobTypeName(a).localeCompare(getJobTypeName(b)) *
          (sortDirection === "asc" ? 1 : -1)
        );
      if (sortKey === "field")
        return (
          (a.fieldName || "").localeCompare(b.fieldName || "") *
          (sortDirection === "asc" ? 1 : -1)
        );
      return 0;
    });

const groupedJobs = jobsToShow.reduce((acc, job) => {
  const key = job.isDetachedFromGroup ? job.id : job.batchTag || job.id;
  if (!acc[key]) acc[key] = [];
  acc[key].push(job);
  return acc;
}, {});


  const handleDelete = async (jobId) => {
    await deleteDoc(doc(db, "jobsByField", jobId));
    setFieldJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  if (loading || !role) return null;
  
useEffect(() => {
  const openModal = () => setShowJobModal(true);
  window.addEventListener("open-job-editor", openModal);
  return () => window.removeEventListener("open-job-editor", openModal);
}, []);
console.log("🧪 jobsToShow:", jobsToShow);
console.log("🧪 groupedJobs:", groupedJobs);

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Jobs"
        actions={
          role !== "viewer" && (
            <Button
              onClick={() => {
                setSelectedJob(null); // 👈 this is what was missing
                setShowJobModal(true);
              }}
            >
              <Plus className="mr-2" size={16} /> Create Job
            </Button>
          )
        }
      />

      <Tabs defaultValue="By Field" value="By Field" className="mb-4">
        <Tab value="By Field">By Field</Tab>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <input
          type="text"
          placeholder="Search jobs..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="border border-gray-300 px-3 py-1 rounded w-full md:w-64"
        />

        {selectedJobs.length > 0 && (
          <Menu as="div" className="relative">
            <Menu.Button className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition">
              ⚙️ Bulk Actions
            </Menu.Button>
            <Menu.Items className="absolute z-50 mt-2 bg-white border border-gray-300 rounded shadow-md w-48">
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`w-full text-left px-4 py-2 text-sm ${
                      active ? "bg-gray-100" : ""
                    }`}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Delete ${selectedJobs.length} selected jobs?`
                        )
                      )
                        return;
                      await Promise.all(
                        selectedJobs.map((id) => handleDelete(id))
                      );
                      setSelectedJobs([]);
                    }}
                  >
                    🗑️ Delete Selected
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Menu>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilterPanel(true)}
            className="text-sm"
          >
            🔍 Filters
          </Button>

          {["date", "type", "field"].map((key) => (
            <button
              key={key}
              onClick={() => {
                if (sortKey === key) {
                  setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                } else {
                  setSortKey(key);
                  setSortDirection("desc");
                }
              }}
              className={`px-3 py-1 rounded text-sm border ${
                sortKey === key
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Sort by {key}
            </button>
          ))}
        </div>
      </div>

      {Object.entries(groupedJobs).map(([groupKey, jobs]) => (
        <div key={groupKey} className="mb-6 border-l-4 border-blue-400 pl-3">
          {jobs.length > 1 && jobs.every((j) => !j.isDetachedFromGroup) && (
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-blue-700 font-semibold">
                Batch of {jobs.length} jobs –{" "}
                {jobs[0].jobType?.name || "Unknown"} on {jobs[0].jobDate}
              </div>
              {role === "admin" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedJob(jobs);
                    setShowJobModal(true);
                  }}
                >
                  ✏️ Edit Batch
                </Button>
              )}
            </div>
          )}

          <div className="space-y-2">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isFieldJob={true}
                onSelect={(j) => {
                  setSelectedJob(j);
                  setShowJobModal(false); // 👈 open preview only
                }}
                onDelete={() => handleDelete(job.id)}
                onStatusChange={(jobId, newStatus) => {
                  setFieldJobs((prev) =>
                    prev.map((j) =>
                      j.id === jobId ? { ...j, status: newStatus } : j
                    )
                  );
                }}
              />
            ))}
          </div>
        </div>
      ))}

      {selectedJob && !showJobModal && (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}

      {showJobModal && (
        <JobEditorModal
          isOpen={showJobModal}
          onClose={() => {
            setShowJobModal(false);
            setSelectedJob(null);
          }}
          initialJobs={
            Array.isArray(selectedJob)
              ? selectedJob
              : selectedJob
              ? [selectedJob]
              : []
          }
        />
      )}
      {showFilterPanel && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 relative">
            <h2 className="text-lg font-semibold mb-4">Filter Jobs</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
              {/* Fields */}
              <DropdownFilter
                label="Fields"
                selected={filterFields}
                setSelected={setFilterFields}
                options={[...new Set(fieldJobs.map((j) => j.fieldName || ""))]}
              />

              {/* Products */}
              <DropdownFilter
                label="Products"
                selected={filterProducts}
                setSelected={setFilterProducts}
                options={[
                  ...new Set(
                    fieldJobs.flatMap(
                      (j) => j.products?.map((p) => p.productName) || []
                    )
                  ),
                ]}
              />

              {/* Job Types */}
              <DropdownFilter
                label="Job Types"
                selected={filterJobTypes}
                setSelected={setFilterJobTypes}
                options={[
                  ...new Set(
                    fieldJobs.map((j) =>
                      typeof j.jobType === "string"
                        ? j.jobType
                        : j.jobType?.name || ""
                    )
                  ),
                ]}
              />

              {/* Vendors */}
              <DropdownFilter
                label="Vendors"
                selected={filterVendors}
                setSelected={setFilterVendors}
                options={[
                  ...new Set(
                    fieldJobs.flatMap(
                      (j) => j.products?.map((p) => p.vendor || "") || []
                    )
                  ),
                ]}
              />

              {/* Applicators */}
              <DropdownFilter
                label="Applicators"
                selected={filterApplicators}
                setSelected={setFilterApplicators}
                options={[...new Set(fieldJobs.map((j) => j.applicator || ""))]}
              />

              {/* Farms */}
              <DropdownFilter
                label="Farms"
                selected={filterFarms}
                setSelected={setFilterFarms}
                options={[...new Set(fieldJobs.map((j) => j.farmName || ""))]}
              />

              {/* Landowners */}
              <DropdownFilter
                label="Landowners"
                selected={filterLandowners}
                setSelected={setFilterLandowners}
                options={[...new Set(fieldJobs.map((j) => j.landowner || ""))]}
              />

              {/* Operators */}
              <DropdownFilter
                label="Operators"
                selected={filterOperators}
                setSelected={setFilterOperators}
                options={[...new Set(fieldJobs.map((j) => j.operator || ""))]}
              />
            </div>

            <div className="mt-6 flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterFields([]);
                  setFilterProducts([]);
                  setFilterJobTypes([]);
                  setFilterVendors([]);
                  setFilterApplicators([]);
                  setFilterFarms([]);
                  setFilterLandowners([]);
                  setFilterOperators([]);
                }}
              >
                Clear Filters
              </Button>
              <Button onClick={() => setShowFilterPanel(false)}>
                Apply Filters
              </Button>
            </div>

            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setShowFilterPanel(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
            <p className="text-sm text-gray-800 mb-4">
              Are you sure you want to delete this job? This can’t be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1 rounded text-sm bg-gray-200 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDelete(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="px-3 py-1 rounded text-sm bg-red-600 text-white hover:bg-red-700"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
