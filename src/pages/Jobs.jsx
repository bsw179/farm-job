// 🔹 Imports
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc, getDoc, setDoc, query, where, updateDoc } from 'firebase/firestore';
import { Tabs, Tab } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Menu } from '@headlessui/react';
import { Plus, Pencil, Trash2, FileText, MoreVertical } from 'lucide-react';
import { db } from '../firebase';
import { auth } from '../firebase';
import { getJobTypeIcon } from '../utils/getJobTypeIcon';
import { CropYearContext } from '../context/CropYearContext';
import { useUser } from '@/context/UserContext';
import JobDetailsModal from '@/components/JobDetailsModal';
import JobCard from '@/components/JobCard';
import JobListItem from '@/components/JobListItem';

import 'leaflet/dist/leaflet.css';  // Only needed if you use Map previews inside Jobs (currently you don't)
import L from 'leaflet';            // Same here

console.log('🧪 LOGGED IN UID:', auth.currentUser?.uid);

// 🔹 State Setup
export default function Jobs() {
  const navigate = useNavigate();
  const { cropYear } = useContext(CropYearContext);
  const { role, loading } = useUser();

  const [view, setView] = useState('By Field');          // Tab: By Field or Grouped
  const [viewMode, setViewMode] = useState('cards');      // View: cards or list

  const [jobs, setJobs] = useState([]);                   // Master jobs (grouped jobs)
  const [fieldJobs, setFieldJobs] = useState([]);          // Field-level jobs (jobsByField)
  const [selectedJob, setSelectedJob] = useState(null);    // Job clicked for details modal
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);  // For Delete Confirm Modal
  const [selectedJobs, setSelectedJobs] = useState([]);    // Bulk selection

  const [searchText, setSearchText] = useState('');        // Search bar
  const [filterStatus, setFilterStatus] = useState('All'); // Status filter
  const [filterType, setFilterType] = useState('All');     // Job type filter
  const [sortKey, setSortKey] = useState('date');          // Sorting: date, type, field
  const [sortDirection, setSortDirection] = useState('desc'); // Sort ascending/descending
  const [showFilterPanel, setShowFilterPanel] = useState(false); // Toggle filters sidebar

  console.log('🧪 loading:', loading, 'role:', role);

  if (loading || !role) return null;


// 🔹 useEffects
useEffect(() => {
  // Force 'By Field' view for viewer role
  if (role === 'viewer' && view === 'Grouped') {
    setView('By Field');
  }
}, [role, view]);

useEffect(() => {
  const fetchJobs = async () => {
    const jobsSnapshot = await getDocs(collection(db, 'jobs'));
    const jobsData = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setJobs(jobsData);

    const fieldJobsSnapshot = await getDocs(collection(db, 'jobsByField'));
    const fieldJobsData = fieldJobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setFieldJobs(fieldJobsData);
  };

  fetchJobs();
}, []);

// 🔹 Helper Functions

const getJobTypeName = (job) =>
  typeof job.jobType === 'string' ? job.jobType : job.jobType?.name || '';

const formatShortDate = (isoString) => {
  if (!isoString) return '—';

  const [year, month, day] = isoString.split('-');
  const localDate = new Date(Number(year), Number(month) - 1, Number(day));

  return localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const handleExportCSV = () => {
  const headers = ['Date', 'Field', 'Job Type', 'Status', 'Vendor', 'Applicator', 'Acres', 'Products'];
  const rows = jobsToShow.map(job => {
    const productSummary = job.products?.map(p =>
      `${p.productName || p.name || '—'} (${p.rate || '?'} ${p.unit || ''})`
    ).join('; ');

    return [
      job.jobDate || '',
      job.fieldName || '',
      getJobTypeName(job) || '',
      job.status || '',
      job.vendor || '',
      job.applicator || '',
      job.acres || job.drawnAcres || '',
      productSummary || ''
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'FieldJobs.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const handleExportPDF = async () => {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF();

  const titleFontSize = 12;
  const bodyFontSize = 10;
  let y = 10;

  jobsToShow.forEach((job, index) => {
    if (index > 0) {
      pdf.addPage();
      y = 10;
    }

    pdf.setFontSize(titleFontSize);
    pdf.text(`Job: ${getJobTypeName(job) || '—'} (${job.status || '—'})`, 10, y);

    y += 8;

    pdf.setFontSize(bodyFontSize);
    pdf.text(`Field: ${job.fieldName || '—'}`, 10, y);
    y += 6;
    pdf.text(`Date: ${job.jobDate || '—'}`, 10, y);
    y += 6;
    pdf.text(`Acres: ${job.acres || job.drawnAcres || '—'}`, 10, y);
    y += 6;

    if (job.vendor) {
      pdf.text(`Vendor: ${job.vendor}`, 10, y);
      y += 6;
    }

    if (job.applicator) {
      pdf.text(`Applicator: ${job.applicator}`, 10, y);
      y += 6;
    }

    y += 4;
    pdf.setFont(undefined, 'bold');
    pdf.text('Products:', 10, y);
    pdf.setFont(undefined, 'normal');
    y += 5;

    job.products?.forEach((p) => {
      const line = `${p.productName || p.name || '—'} – ${p.rate || '—'} ${p.unit || ''}`;
      pdf.text(line, 14, y);
      y += 5;
    });

    if (job.notes) {
      y += 4;
      pdf.setFont(undefined, 'bold');
      pdf.text('Notes:', 10, y);
      pdf.setFont(undefined, 'normal');
      y += 5;

      const splitNotes = pdf.splitTextToSize(job.notes, 180);
      pdf.text(splitNotes, 14, y);
      y += splitNotes.length * 5;
    }
  });

  pdf.save('FieldJobs.pdf');
};

// 🔹 Handle Deleting a Job or Field Job
const handleDelete = async (jobId, isFieldJob = false) => {
  const ref = doc(db, isFieldJob ? 'jobsByField' : 'jobs', jobId);

  if (isFieldJob) {
    const jobDoc = await getDoc(ref);
    if (!jobDoc.exists()) return;

    const jobData = jobDoc.data();
    const { linkedToJobId, fieldId } = jobData;

    // Delete the jobsByField document
    await deleteDoc(ref);
    setFieldJobs(prev => prev.filter(j => j.id !== jobId));

    // If it was linked to a group, clean up the group
    if (linkedToJobId) {
      const masterRef = doc(db, 'jobs', linkedToJobId);
      const masterSnap = await getDoc(masterRef);
      if (!masterSnap.exists()) return;

      const masterData = masterSnap.data();
      const updatedFields = (masterData.fields || []).filter(f => f.id !== fieldId);
      const updatedFieldIds = (masterData.fieldIds || []).filter(id => id !== fieldId);

      // Re-check how many field jobs are left linked to the group
      const q = query(
        collection(db, 'jobsByField'),
        where('linkedToJobId', '==', linkedToJobId)
      );
      const snap = await getDocs(q);

      if (snap.size === 1) {
        // Only one left → unlink it and delete the group
        const leftoverDoc = snap.docs[0];
        await updateDoc(leftoverDoc.ref, {
          linkedToJobId: null,
          isDetachedFromGroup: true
        });

        await deleteDoc(masterRef);
        setJobs(prev => prev.filter(j => j.id !== linkedToJobId));
      } else if (snap.size === 0) {
        // No fields left → delete group
        await deleteDoc(masterRef);
        setJobs(prev => prev.filter(j => j.id !== linkedToJobId));
      } else {
        // Still multiple fields left → update master
        await setDoc(masterRef, {
          ...masterData,
          fields: updatedFields,
          fieldIds: updatedFieldIds
        });
      }

      await fetchJobs(); // ✅ Refresh jobs and fieldJobs
    }
  } else {
    // Deleting a master group job
    const fieldJobSnap = await getDocs(collection(db, 'jobsByField'));
    const linkedFieldJobs = fieldJobSnap.docs.filter(doc => doc.data().linkedToJobId === jobId);

    await Promise.all(
      linkedFieldJobs.map(docSnap =>
        deleteDoc(doc(db, 'jobsByField', docSnap.id))
      )
    );

    await deleteDoc(ref);
    setJobs(prev => prev.filter(j => j.id !== jobId));
    setFieldJobs(prev => prev.filter(j => j.linkedToJobId !== jobId));
  }
};

// 🔹 Filter + Sort Jobs
const filteredJobs = jobs.filter((job) => job.cropYear === cropYear);
const filteredFieldJobs = fieldJobs.filter((job) => job.cropYear === cropYear);

const jobsToShow = (view === 'By Field' ? filteredFieldJobs : filteredJobs)
  .map(job => {
  if (view === 'Grouped') {
  const attachedFields = fieldJobs.filter(
    f => job.fieldIds?.includes(f.fieldId) && !f.isDetachedFromGroup
  );

  return {
    ...job,
    fields: job.fields?.length ? job.fields : attachedFields
  };
}

    return job;
  })
  .filter((job) => {
    const matchesStatus = filterStatus === 'All' || job.status === filterStatus;
    const matchesType = filterType === 'All' || getJobTypeName(job) === filterType;

    const matchesSearch = (() => {
      const fieldMatch = view === 'By Field'
        ? job.fieldName?.toLowerCase().includes(searchText.toLowerCase())
        : job.fields?.some(f => f.fieldName?.toLowerCase().includes(searchText.toLowerCase()));

      const productMatch = job.products?.some(p =>
        p.productName?.toLowerCase().includes(searchText.toLowerCase())
      );

      const typeMatch = (typeof job.jobType === 'string'
        ? job.jobType
        : job.jobType?.name || '').toLowerCase().includes(searchText.toLowerCase());

      return fieldMatch || productMatch || typeMatch;
    })();

    return matchesStatus && matchesType && matchesSearch;
  })
  .sort((a, b) => {
    if (sortKey === 'date') {
      const compare = (a.jobDate || '').localeCompare(b.jobDate || '');
      return sortDirection === 'asc' ? compare : -compare;
    }

    if (sortKey === 'type') {
      const typeA = typeof a.jobType === 'string' ? a.jobType : a.jobType?.name || '';
      const typeB = typeof b.jobType === 'string' ? b.jobType : b.jobType?.name || '';
      return typeA.localeCompare(typeB);
    }

    if (sortKey === 'field') {
      const nameA = view === 'By Field' ? a.fieldName : a.fields?.[0]?.fieldName || '';
      const nameB = view === 'By Field' ? b.fieldName : b.fields?.[0]?.fieldName || '';
      return nameA.localeCompare(nameB);
    }

    return 0;
  });
 const fetchJobs = async () => {
    await loadJobs();
  };
// 🔹 Render Start (Header + Tabs + View Switch)

return (
  <div className="p-4 md:p-6">
<PageHeader
  title="Jobs"
  actions={
 <Button
  onClick={() => {
    console.log('🧭 Navigating to Job Summary');
    navigate('/jobs/summary', {
      state: {
       cropYear: new Date().getFullYear(),
        selectedFields: [],
        isEditing: false,
      }
    });
  }}
>
  <Plus className="mr-2" size={16} /> Create Job
</Button>

  }
/>


    {/* 🔹 Tabs for By Field vs Grouped */}
    {role === 'viewer' ? (
      <Tabs defaultValue="By Field" value={view} onValueChange={setView} className="mb-4">
        <Tab value="By Field">By Field</Tab>
      </Tabs>
    ) : (
      <Tabs defaultValue="By Field" value={view} onValueChange={setView} className="mb-4">
        <Tab value="By Field">By Field</Tab>
        <Tab value="Grouped">Grouped (Bulk Edit Only)</Tab>
      </Tabs>
    )}

    {/* 🔹 Card View vs List View Switch */}
    <div className="flex gap-2 items-center mb-4">
      <button
        onClick={() => setViewMode('cards')}
        className={`p-1 rounded ${viewMode === 'cards' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
      >
        🟦 Card View
      </button>
      <button
        onClick={() => setViewMode('list')}
        className={`p-1 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
      >
        📋 List View
      </button>
    </div>

// 🔹 Search, Sort, Filters Bar
<div className="flex flex-wrap items-center justify-between gap-3 mb-4">
  {/* 🔎 Search Bar */}
  <input
    type="text"
    placeholder="Search jobs..."
    value={searchText}
    onChange={e => setSearchText(e.target.value)}
    className="border border-gray-300 px-3 py-1 rounded w-full md:w-64"
  />

  {/* 🔵 Bulk Actions Menu (if jobs selected) */}
  {selectedJobs.length > 0 && (
    <Menu as="div" className="relative">
      <Menu.Button className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition">
        ⚙️ Bulk Actions
      </Menu.Button>
      <Menu.Items className="absolute z-50 mt-2 bg-white border border-gray-300 rounded shadow-md w-48">
        <Menu.Item>
          {({ active }) => (
            <button
              className={`w-full text-left px-4 py-2 text-sm ${active ? 'bg-gray-100' : ''}`}
              onClick={async () => {
                const confirm = window.confirm(`Delete ${selectedJobs.length} selected jobs?`);
                if (!confirm) return;

                await Promise.all(
                  selectedJobs.map(async (id) => {
                    if (view === 'By Field') {
                      await handleDelete(id, true);
                    } else {
                      const fieldJobSnap = await getDocs(collection(db, 'jobsByField'));
                      const linkedFieldJobs = fieldJobSnap.docs.filter(
                        (doc) => doc.data().linkedToJobId === id
                      );

                      await Promise.all(
                        linkedFieldJobs.map((docSnap) =>
                          deleteDoc(doc(db, 'jobsByField', docSnap.id))
                        )
                      );

                      await handleDelete(id, false);
                    }
                  })
                );

                setJobs(prev => prev.filter(j => !selectedJobs.includes(j.id)));
                setFieldJobs(prev => prev.filter(j => 
                  !selectedJobs.includes(j.id) && !selectedJobs.includes(j.linkedToJobId)
                ));
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

  {/* 🔻 Sort Buttons */}
  <div className="flex items-center gap-2">
    {['date', 'type', 'field'].map(key => (
      <button
        key={key}
        onClick={() => {
          if (sortKey === key) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
          } else {
            setSortKey(key);
            setSortDirection('desc');
          }
        }}
        className={`px-3 py-1 rounded text-sm border ${
          sortKey === key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        Sort by {key}
      </button>
    ))}
  </div>

  {/* 🛠 Filters Panel + Export Buttons */}
  <div className="relative">
    <button
      onClick={() => setShowFilterPanel(prev => !prev)}
      className="text-sm border rounded px-3 py-1 text-gray-700 hover:bg-gray-100"
    >
      Filters
    </button>

    {view === 'By Field' && (
      <Menu as="div" className="relative ml-2">
        <Menu.Button className="bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700 transition">
          📤 Export
        </Menu.Button>
        <Menu.Items className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow z-50">
          <Menu.Item>
            {({ active }) => (
              <button
                className={`block w-full px-4 py-2 text-sm text-left ${active ? 'bg-gray-100' : ''}`}
                onClick={handleExportCSV}
              >
                📊 Export as CSV
              </button>
            )}
          </Menu.Item>

          {role !== 'viewer' && (
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`block w-full px-4 py-2 text-sm text-left ${active ? 'bg-gray-100' : ''}`}
                  onClick={handleExportPDF}
                >
                  📄 Export as PDF
                </button>
              )}
            </Menu.Item>
          )}
        </Menu.Items>
      </Menu>
    )}

    {/* 🎛️ Filters Panel */}
    {showFilterPanel && (
      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow p-3 z-50">
        <div className="mb-2 text-xs font-semibold text-gray-500">Status</div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="mb-3 w-full border rounded px-2 py-1 text-sm"
        >
          <option value="All">All</option>
          <option value="Planned">Planned</option>
          <option value="Completed">Completed</option>
        </select>

        <div className="mb-2 text-xs font-semibold text-gray-500">Job Type</div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm"
        >
          <option value="All">All</option>
          {[...new Set([...jobs, ...fieldJobs].map(j => 
            typeof j.jobType === 'string' ? j.jobType : j.jobType?.name
          ).filter(Boolean))].map(type => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
    )}
  </div>
</div>

// 🔹 Jobs List or Card Map
<div className={viewMode === 'cards' ? '' : 'flex flex-col divide-y border rounded'}>
  
  {/* Optional Header Row for List View */}
  {viewMode === 'list' && (
    <div className="flex items-center justify-between border-b py-2 px-2 text-sm font-semibold text-gray-700 bg-gray-50">
      {role !== 'viewer' && (
        <input
          type="checkbox"
          checked={
            selectedJobs.length > 0 && selectedJobs.length === jobsToShow.length
          }
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedJobs(jobsToShow.map(j => j.id));
            } else {
              setSelectedJobs([]);
            }
          }}
        />
      )}
      <div className="flex-1" />
      <span className="opacity-0">⋯</span>
    </div>
  )}

  {/* 🔹 Jobs Map */}
  {jobsToShow.map(job =>
    viewMode === 'cards' ? (
      <JobCard
        key={job.id}
        job={job}
        isFieldJob={view === 'By Field'}
        onSelect={setSelectedJob}
        onDelete={handleDelete}
      />
    ) : (
      <JobListItem
        key={job.id}
        job={job}
        isFieldJob={view === 'By Field'}
        onSelect={setSelectedJob}
        onDelete={handleDelete}
        selectedJobs={selectedJobs}
        setSelectedJobs={setSelectedJobs}
      />
    )
  )}
</div>
{/* Job Details Modal (opens when clicking a job card or list item) */}
{selectedJob && (
  <JobDetailsModal
    job={selectedJob}
    onClose={() => setSelectedJob(null)}
  />
)}

{/* Confirm Delete Modal */}
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
            handleDelete(confirmDeleteId, view === 'By Field');
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
// closes Jobs function

// ✅ End of Jobs.jsx
}
