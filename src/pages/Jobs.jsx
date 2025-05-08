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
    .filter((j) => j.cropYear === cropYear)
    .filter(
      (j) =>
        (filterStatus === "All" || j.status === filterStatus) &&
        (filterType === "All" || getJobTypeName(j) === filterType) &&
        (j.fieldName?.toLowerCase().includes(searchText.toLowerCase()) ||
          j.products?.some((p) =>
            p.productName?.toLowerCase().includes(searchText.toLowerCase())
          ) ||
          getJobTypeName(j).toLowerCase().includes(searchText.toLowerCase()))
    )
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

  const handleDelete = async (jobId) => {
    await deleteDoc(doc(db, "jobsByField", jobId));
    setFieldJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  if (loading || !role) return null;

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Jobs"
        actions={
          role !== "viewer" && (
            <Button onClick={() => setShowJobModal(true)}>
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

      <div>
        {jobsToShow.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            isFieldJob={true}
            onSelect={setSelectedJob}
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

      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
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

      <JobEditorModal
        isOpen={showJobModal}
        onClose={() => setShowJobModal(false)}
      />
    </div>
  );
}
