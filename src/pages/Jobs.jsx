// src/pages/Jobs.jsx
import React, { useState, useEffect, useContext } from 'react';
import { Tabs, Tab } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { Menu } from '@headlessui/react';
import { MoreVertical } from 'lucide-react';
import { getJobTypeIcon } from '../utils/getJobTypeIcon';
import { CropYearContext } from '../context/CropYearContext';


export default function Jobs() {
  const { cropYear } = useContext(CropYearContext);
const [view, setView] = useState('By Field');
  const [jobs, setJobs] = useState([]);
  const [fieldJobs, setFieldJobs] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
const [viewMode, setViewMode] = useState('cards'); // or 'list'
const [searchText, setSearchText] = useState('');
const [sortKey, setSortKey] = useState('date'); // or 'type', 'field'
const [showFilterPanel, setShowFilterPanel] = useState(false);
const [filterStatus, setFilterStatus] = useState('All'); // 'All', 'Planned', 'Completed'
const [filterType, setFilterType] = useState('All'); // or specific job type name

  const navigate = useNavigate();

  useEffect(() => {
    const fetchJobs = async () => {
      const jobsSnapshot = await getDocs(collection(db, 'jobs'));
      const jobsData = jobsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setJobs(jobsData);

      const fieldJobsSnapshot = await getDocs(collection(db, 'jobsByField'));
      const fieldJobsData = fieldJobsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setFieldJobs(fieldJobsData);
    };

    fetchJobs();
  }, []);

const handleDelete = async (jobId, isFieldJob = false) => {
  const ref = doc(db, isFieldJob ? 'jobsByField' : 'jobs', jobId);

  if (isFieldJob) {
    const jobDoc = await getDoc(ref);
    if (!jobDoc.exists()) return;

    const jobData = jobDoc.data();
    const { linkedToJobId, fieldId } = jobData;

    // Delete the jobsByField doc
    await deleteDoc(ref);
    setFieldJobs(fieldJobs.filter((j) => j.id !== jobId));

    // Now update the master job if linked
    if (linkedToJobId) {
      const masterRef = doc(db, 'jobs', linkedToJobId);
      const masterSnap = await getDoc(masterRef);
      if (!masterSnap.exists()) return;

      const masterData = masterSnap.data();
      const updatedFields = (masterData.fields || []).filter(f => f.id !== fieldId);
      const updatedFieldIds = (masterData.fieldIds || []).filter(id => id !== fieldId);

      if (updatedFieldIds.length === 0) {
        // No fields left, delete the master job too
        await deleteDoc(masterRef);
        setJobs(jobs.filter((j) => j.id !== linkedToJobId));
      } else {
        // Otherwise just update it
        await setDoc(masterRef, {
          ...masterData,
          fields: updatedFields,
          fieldIds: updatedFieldIds
        });
      }
    }
  } else {
    // It's a master job — delete it
    await deleteDoc(ref);
    setJobs(jobs.filter((j) => j.id !== jobId));
  }
};


  const renderJobCard = (job, isFieldJob = false) => (
    <Card key={job.id}>
      <div className="flex justify-between items-start">
        <div>
<div className="text-sm font-semibold text-blue-700 flex items-center gap-1">
  <img
    src={getJobTypeIcon(job.jobType)}
    alt={job.jobType}
    className="w-4 h-4 inline-block"
  />
  {job.jobType}
</div>
          <div className="text-xs text-gray-500">
  {job.cropYear} • {isFieldJob
    ? job.fieldName
    : job.fields?.map(f => f.fieldName).join(', ')
  }
</div>

        </div>
        <div className="flex gap-2">
         <Button
  size="icon"
  variant="ghost"
  onClick={() => {
    if (isFieldJob) {
      navigate(`/jobs/field/${job.id}`);
    } else {
      navigate('/jobs/summary', {
        state: {
          isEditing: true,
          jobId: job.id,
          jobType: job.jobType,
          jobDate: job.jobDate,
          vendor: job.vendor,
          applicator: job.applicator,
          products: job.products,
          selectedFields: job.fields || [],
          cropYear: job.cropYear
        }
      });
    }
  }}
>
  <Pencil size={16} />
</Button>

<Button
  size="icon"
  variant="ghost"
  onClick={() => setConfirmDeleteId(job.id)}
>
  <Trash2 size={16} />
</Button>
          <Button size="icon" variant="ghost"><FileText size={16} /></Button>
        </div>
      </div>
      <div className="text-sm text-gray-800">
        {job.products?.map((p, idx) => (
          <div key={idx} className="text-xs text-gray-600">
            {p.name} • {p.rate} {p.unit}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Badge variant={job.status?.toLowerCase()}>{job.status}</Badge>
        {job.totalAcres} acres
      </div>
    </Card>
  );
const renderListItem = (job, isFieldJob) => {
  return (
    <div className="flex items-center justify-between border-b py-3 px-2 hover:bg-gray-50">
      <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap text-sm">
        <input type="checkbox" />
        <div>{job.jobDate || '—'}</div>
<div className="text-gray-700 flex items-center gap-1">
  <img
    src={getJobTypeIcon(job.jobType)}
    alt={job.jobType}
    className="w-5 h-5 inline-block"
  />
  {job.jobType}
</div>

<div>
  {isFieldJob
    ? job.fieldName
    : job.fields?.map(f => f.fieldName).join(', ') || '—'}
</div>
        <div>{job.products?.[0]?.productName || '—'}</div>
<div>
  {isFieldJob
    ? `${job.acres?.toFixed?.(1) || '—'} ac`
    : `${Object.values(job.acres || {}).reduce((sum, val) => sum + (val || 0), 0).toFixed(1)} ac`}
</div>
        <Badge variant={job.status?.toLowerCase()}>{job.status}</Badge>
      </div>
      <div>
<div className="relative">
  <Menu>
    <Menu.Button className="text-gray-500 hover:text-gray-700">
      <MoreVertical size={18} />
    </Menu.Button>
    <Menu.Items className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-md z-50">
      <Menu.Item>
        {({ active }) => (
          <button
            className={`block w-full px-4 py-2 text-sm text-left ${active ? 'bg-gray-100' : ''}`}
            onClick={() => {
              if (isFieldJob) {
                navigate(`/jobs/field/${job.id}`);
              } else {
                navigate('/jobs/summary', {
                  state: {
                    isEditing: true,
                    jobId: job.id,
                    jobType: job.jobType,
                    jobDate: job.jobDate,
                    vendor: job.vendor,
                    applicator: job.applicator,
                    products: job.products,
                    selectedFields: job.fields || [],
                    cropYear: job.cropYear
                  }
                });
              }
            }}
          >
            ✏️ Edit
          </button>
        )}
      </Menu.Item>
      <Menu.Item>
        {({ active }) => (
          <button
            className={`block w-full px-4 py-2 text-sm text-left ${active ? 'bg-gray-100' : ''}`}
            onClick={() => handleDelete(job.id, isFieldJob)}
          >
            🗑️ Delete
          </button>
        )}
      </Menu.Item>
     <Menu.Item>
  {({ active }) => (
    <button
      className={`block w-full px-4 py-2 text-sm text-left ${active ? 'bg-gray-100' : ''}`}
      onClick={async () => {
        const { generatePDFBlob } = await import('../utils/generatePDF');
        const blob = await generatePDFBlob(job);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `JobOrder_${job.jobType}_${job.cropYear}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }}
    >
      📄 PDF
    </button>
  )}
</Menu.Item>

      <Menu.Item>
  {({ active }) => (
    <button
      className={`block w-full px-4 py-2 text-sm text-left ${active ? 'bg-gray-100' : ''}`}
      onClick={async () => {
        const newStatus = job.status === 'Planned' ? 'Completed' : 'Planned';
        const ref = doc(db, isFieldJob ? 'jobsByField' : 'jobs', job.id);
        await setDoc(ref, { ...job, status: newStatus }, { merge: true });

        // Refresh UI locally
        if (isFieldJob) {
          setFieldJobs(prev =>
            prev.map(j => (j.id === job.id ? { ...j, status: newStatus } : j))
          );
        } else {
          setJobs(prev =>
            prev.map(j => (j.id === job.id ? { ...j, status: newStatus } : j))
          );
        }
      }}
    >
      {job.status === 'Planned' ? '✔️ Mark as Completed' : '↩️ Mark as Planned'}
    </button>
  )}
</Menu.Item>

    </Menu.Items>
  </Menu>
</div>
      </div>
    </div>
  );
};

  const filteredJobs = jobs.filter((job) => job.cropYear === cropYear);
  const filteredFieldJobs = fieldJobs.filter((job) => job.cropYear === cropYear);

  const jobsToShow = (view === 'By Field' ? filteredFieldJobs : filteredJobs)
  .filter((job) => {
    const matchesStatus =
      filterStatus === 'All' || job.status === filterStatus;

    const matchesType =
      filterType === 'All' || job.jobType === filterType;

    const matchesSearch = (() => {
      const fieldMatch = view === 'By Field'
        ? job.fieldName?.toLowerCase().includes(searchText.toLowerCase())
        : job.fields?.some(f => f.fieldName?.toLowerCase().includes(searchText.toLowerCase()));

      const productMatch = job.products?.some(p =>
        p.productName?.toLowerCase().includes(searchText.toLowerCase())
      );

      const typeMatch = job.jobType?.toLowerCase().includes(searchText.toLowerCase());

      return fieldMatch || productMatch || typeMatch;
    })();

    return matchesStatus && matchesType && matchesSearch;
  })
  .sort((a, b) => {
    if (sortKey === 'date') {
      return (a.jobDate || '').localeCompare(b.jobDate || '');
    }
    if (sortKey === 'type') {
      return a.jobType?.localeCompare(b.jobType || '');
    }
    if (sortKey === 'field') {
      const nameA = view === 'By Field' ? a.fieldName : a.fields?.[0]?.fieldName || '';
      const nameB = view === 'By Field' ? b.fieldName : b.fields?.[0]?.fieldName || '';
      return nameA.localeCompare(nameB);
    }
    return 0;
  });


  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Jobs"
        actions={<Button onClick={() => navigate('/jobs/create')}><Plus className="mr-2" size={16} /> Create Job</Button>}
      />

     <Tabs defaultValue="By Field" value={view} onValueChange={setView} className="mb-4">
  <Tab value="By Field">By Field</Tab>
  <Tab value="Grouped">Grouped (Bulk Edit Only)</Tab>
</Tabs>

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
<div className="flex flex-wrap items-center justify-between gap-3 mb-4">
  {/* 🔍 Search */}
  <input
    type="text"
    placeholder="Search jobs..."
    value={searchText}
    onChange={e => setSearchText(e.target.value)}
    className="border border-gray-300 px-3 py-1 rounded w-full md:w-64"
  />

  {/* 📎 Sort buttons */}
  <div className="flex items-center gap-2">
    {['date', 'type', 'field'].map(key => (
      <button
        key={key}
        onClick={() => setSortKey(key)}
        className={`px-3 py-1 rounded text-sm border ${
          sortKey === key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        Sort by {key}
      </button>
    ))}
  </div>

  {/* 🎛️ Filters Button (stub for now) */}
  <div className="relative">
  <button
    onClick={() => setShowFilterPanel(prev => !prev)}
    className="text-sm border rounded px-3 py-1 text-gray-700 hover:bg-gray-100"
  >
    Filters
  </button>

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
        {Array.from(new Set([...jobs, ...fieldJobs].map(j => j.jobType))).map((type) => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
    </div>
  )}
</div>

</div>

     <div className={viewMode === 'cards'
  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
  : 'flex flex-col divide-y border rounded'}>
  {jobsToShow.map(job =>
  viewMode === 'cards'
    ? renderJobCard(job, view === 'By Field')
    : renderListItem(job, view === 'By Field')
)}

</div>

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
}
