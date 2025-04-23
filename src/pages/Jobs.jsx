// src/pages/Jobs.jsx
import JobDetailsModal from "@/components/JobDetailsModal";

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
  setDoc,
  query,
  where,
  updateDoc // 👈 this guy
} from 'firebase/firestore';


import { Menu } from '@headlessui/react';
import { MoreVertical } from 'lucide-react';
import { getJobTypeIcon } from '../utils/getJobTypeIcon';
import { CropYearContext } from '../context/CropYearContext';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { useUser } from '@/context/UserContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { auth } from '../firebase';

console.log('🧪 LOGGED IN UID:', auth.currentUser?.uid);


export default function Jobs() {
  const { cropYear } = useContext(CropYearContext);
const { role, loading } = useUser();

console.log('🧪 loading:', loading, 'role:', role);

if (loading || !role) return null;


const [view, setView] = useState('By Field');

// 🔒 Prevent viewer from switching to Grouped tab
useEffect(() => {
  if (role === 'viewer' && view === 'Grouped') {
    setView('By Field');
  }
}, [role, view]);

  const [jobs, setJobs] = useState([]);
  const [fieldJobs, setFieldJobs] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
const [viewMode, setViewMode] = useState('cards'); // or 'list'
const [searchText, setSearchText] = useState('');
const [sortKey, setSortKey] = useState('date'); // or 'type', 'field'
const [showFilterPanel, setShowFilterPanel] = useState(false);
const [filterStatus, setFilterStatus] = useState('All'); // 'All', 'Planned', 'Completed'
const [filterType, setFilterType] = useState('All'); // or specific job type name
const [sortDirection, setSortDirection] = useState('desc'); // 'desc' = newest first
const [selectedJob, setSelectedJob] = useState(null);
const [selectedJobs, setSelectedJobs] = useState([]);

const getJobTypeName = (job) =>
  typeof job.jobType === 'string' ? job.jobType : job.jobType?.name || '';
const formatShortDate = (isoString) => {
  if (!isoString) return '—';

  const [year, month, day] = isoString.split('-');
  const localDate = new Date(Number(year), Number(month) - 1, Number(day));

  return localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};


  const navigate = useNavigate();
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
console.log(jobsToShow)
  jobsToShow.forEach((job, index) => {
    if (index > 0) {
      pdf.addPage();
      y = 10;
    }

    // Title
    pdf.setFontSize(titleFontSize);
    pdf.text(`Job: ${getJobTypeName(job) || '—'} (${job.status || '—'})`, 10, y);

    y += 8;

    // Meta
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

    // Products
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

    // Notes
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

   const fetchJobs = async () => {
      const jobsSnapshot = await getDocs(collection(db, 'jobs'));
      const jobsData = jobsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setJobs(jobsData);

      const fieldJobsSnapshot = await getDocs(collection(db, 'jobsByField'));
      const fieldJobsData = fieldJobsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setFieldJobs(fieldJobsData);
    };
  useEffect(() => {
    fetchJobs();
  }, []);

const handleDelete = async (jobId, isFieldJob = false) => {
  const ref = doc(db, isFieldJob ? 'jobsByField' : 'jobs', jobId);

  if (isFieldJob) {
    const jobDoc = await getDoc(ref);
    if (!jobDoc.exists()) return;

    const jobData = jobDoc.data();
    const { linkedToJobId, fieldId } = jobData;
console.log('🧹 Removing fieldId from master job:', fieldId);

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

  // Delete the field job
  await deleteDoc(ref);
  setFieldJobs(fieldJobs.filter((j) => j.id !== jobId));

  // Re-check what's left in Firestore
  const q = query(
    collection(db, 'jobsByField'),
    where('linkedToJobId', '==', linkedToJobId)
  );
  const snap = await getDocs(q);

  if (snap.size === 1) {
    // Only one job left — unlink it and delete the group
    const leftoverDoc = snap.docs[0];
    await updateDoc(leftoverDoc.ref, {
      linkedToJobId: null,
      isDetachedFromGroup: true
    });

    await deleteDoc(masterRef);
    setJobs(jobs.filter((j) => j.id !== linkedToJobId));
    await fetchJobs();
  } else if (snap.size === 0) {
    // No field jobs left — delete group
    await deleteDoc(masterRef);
    setJobs(jobs.filter((j) => j.id !== linkedToJobId));
    await fetchJobs();
  } else {
    // More than one field job left — update group with new field list
    await setDoc(masterRef, {
      ...masterData,
      fields: updatedFields,
      fieldIds: updatedFieldIds
    });
  }
}

} else {
  // 🔥 Delete all field jobs linked to this group
  const fieldJobSnap = await getDocs(
    collection(db, 'jobsByField')
  );
  const linkedFieldJobs = fieldJobSnap.docs.filter(
    (doc) => doc.data().linkedToJobId === jobId
  );

  await Promise.all(
    linkedFieldJobs.map((docSnap) =>
      deleteDoc(doc(db, 'jobsByField', docSnap.id))
    )
  );

  // 🗑️ Delete the master job
  await deleteDoc(ref);
  setJobs(jobs.filter((j) => j.id !== jobId));
  setFieldJobs((prev) =>
    prev.filter((j) => j.linkedToJobId !== jobId)
  );
}

};


  const renderJobCard = (job, isFieldJob = false) => (
  <Card
    key={job.id}
    onClick={() => setSelectedJob(job)}
    className="cursor-pointer hover:shadow-md transition"
    title="Click for details"
  >
    {/* 📋 Header (job type + field name) */}
    <div className="flex justify-between items-start">
      <div>
        <div className="text-sm font-semibold text-blue-700 flex items-center gap-1">
          <img
            src={getJobTypeIcon(getJobTypeName(job))}
            alt={getJobTypeName(job)}
            className="w-4 h-4 inline-block"
          />
          {getJobTypeName(job)}
        </div>

<div className="text-xs text-gray-500 leading-tight">
  {job.cropYear} • {isFieldJob
    ? job.fieldName
    : [...new Set(job.fields?.filter(f => !f.isDetachedFromGroup).map(f => f.fieldName))].join(', ')


  }
  <br />
  {formatShortDate(job.jobDate)}
</div>



      </div>

      {/* 🛠 Actions (edit/delete/pdf) */}
      {/* 🛠 Actions (edit/delete/pdf) */}
{role !== 'viewer' && (
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
         selectedFields: Array.from(
  new Map(
    fieldJobs
      .filter(f => job.fieldIds?.includes(f.fieldId) && !f.isDetachedFromGroup)
      .sort((a, b) => {
        const hasPolyA = !!a.drawnPolygon;
        const hasPolyB = !!b.drawnPolygon;
        if (hasPolyA && !hasPolyB) return -1;
        if (!hasPolyA && hasPolyB) return 1;
        return (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0);
      })
      .map(f => [f.fieldId, f])
  ).values()
),



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
      onClick={(e) => {
        e.stopPropagation();
        setConfirmDeleteId(job.id);
      }}
    >
      <Trash2 size={16} />
    </Button>

    <Button
      size="icon"
      variant="ghost"
      onClick={(e) => {
        e.stopPropagation();
        // optional: trigger your PDF logic here
      }}
    >
      <FileText size={16} />
    </Button>
    <Button
  size="icon"
  variant="ghost"
  onClick={async (e) => {
    e.stopPropagation();
    const newStatus = job.status === 'Planned' ? 'Completed' : 'Planned';

    if (isFieldJob) {
      const ref = doc(db, 'jobsByField', job.id);
      await setDoc(ref, { ...job, status: newStatus }, { merge: true });

      setFieldJobs(prev =>
        prev.map(j => (j.id === job.id ? { ...j, status: newStatus } : j))
      );

      // Sync to grouped job if needed
      if (job.linkedToJobId) {
        const groupRef = doc(db, 'jobs', job.linkedToJobId);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists()) {
          const groupData = groupSnap.data();
          const updatedFields = (groupData.fields || []).map(f =>
            f.id === job.fieldId ? { ...f, status: newStatus } : f
          );
          await setDoc(groupRef, { ...groupData, fields: updatedFields }, { merge: true });
        }
      }
    } else {
      const ref = doc(db, 'jobs', job.id);
      await setDoc(ref, { ...job, status: newStatus }, { merge: true });

      setJobs(prev =>
        prev.map(j => (j.id === job.id ? { ...j, status: newStatus } : j))
      );

      // Update field jobs too
      const snap = await getDocs(collection(db, 'jobsByField'));
      const linked = snap.docs.filter(doc => doc.data().linkedToJobId === job.id);

      await Promise.all(
        linked.map(docSnap =>
          setDoc(doc(db, 'jobsByField', docSnap.id), {
            ...docSnap.data(),
            status: newStatus
          }, { merge: true })
        )
      );

      setFieldJobs(prev =>
        prev.map(j =>
          j.linkedToJobId === job.id ? { ...j, status: newStatus } : j
        )
      );
    }
  }}
>
  {job.status === 'Planned' ? '✔️' : '↩️'}
</Button>

  </div>
)}

    </div>

    {/* 🟦 CARD CONTENT (By Field) */}
    {isFieldJob ? (
      <>
        <div className="text-sm text-gray-600">
          {(() => {
            const p = job.products?.[0];
            if (!p) return '—';
            return `${p.productName || p.name || '—'} • ${p.rate || ''} ${p.unit || ''}`;
          })()}
        </div>

        <div className="flex flex-col gap-0.5 text-xs text-gray-500">
     <div className="flex items-center gap-2 text-xs text-gray-500">
  <Badge variant={job.status?.toLowerCase()}>{job.status}</Badge>

  {job.linkedToJobId && (
    <Badge variant="outline">🔗 Grouped</Badge>
  )}

  {(() => {
    const isLeveeJob = (job.jobType?.name || '').toLowerCase().includes('levee') ||
                       (job.jobType?.name || '').toLowerCase().includes('pack');
    const crop = job.crop || '';

    if (isLeveeJob) {
      if (crop.includes('Rice')) return `${job.riceLeveeAcres || '—'} acres (Levee – Rice)`;
      if (crop.includes('Soybean')) return `${job.beanLeveeAcres || '—'} acres (Levee – Soybeans)`;
    }

    return `${job.acres || job.drawnAcres || '—'} acres`;
  })()}
</div>

        </div>

        {job.jobType?.parentName === 'Tillage' && job.passes && (
          <div className="text-xs text-gray-500">
            Passes: {job.passes}
          </div>
        )}
      </>
    ) : (
      // 🟦 CARD CONTENT (Grouped)
      <>
        <div className="text-sm text-gray-600">
          {(() => {
            const p = job.products?.[0];
            if (!p) return '—';
            return `${p.productName || p.name || '—'} • ${p.rate || ''} ${p.unit || ''}`;
          })()}
        </div>

        <div className="flex flex-col gap-0.5 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Badge variant={job.status?.toLowerCase()}>{job.status}</Badge>
            {(() => {
              const isLeveeJob = (job.jobType?.name || '').toLowerCase().includes('levee') ||
                                 (job.jobType?.name || '').toLowerCase().includes('pack');

              if (isLeveeJob && Array.isArray(job.fields)) {
                let total = 0;
                job.fields.forEach(f => {
                  const crop = f.crop || f.crops?.[job.cropYear]?.crop || '';
                  if (crop.includes('Rice')) total += parseFloat(f.riceLeveeAcres || 0);
                  else if (crop.includes('Soybean')) total += parseFloat(f.beanLeveeAcres || 0);
                });
                return `${total.toFixed(2)} acres (Levee)`;
              }

            if (Array.isArray(job.fields)) {
  const total = job.fields.reduce((sum, f) => sum + (f.acres || 0), 0);
  return `${total.toFixed(2)} acres`;
}

return '— acres';

            })()}
          </div>

          {job.jobType?.parentName === 'Tillage' && job.passes && (
            <div>Passes: {job.passes}</div>
          )}
        </div>
      </>
    )}
  </Card>
);

const renderListItem = (job, isFieldJob) => {
  return (
 <div
  className="flex items-center justify-between ..."
  onClick={(e) => {
    const tag = e.target.tagName?.toLowerCase();
    const isInsideMenu = e.target.closest('.job-menu');
    if (tag === 'input' || isInsideMenu) return;
    setSelectedJob(job);
  }}
>

      {/* 📋 List View Left Section */}
      <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap text-sm">
        {/* ⬜ Checkbox */}
       {role !== 'viewer' && (
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


        {/* 📅 Job Date */}
        <div>{job.jobDate || '—'}</div>

        {/* 🌱 Job Type */}
        <div className="text-gray-700 flex items-center gap-1">
          <img
            src={getJobTypeIcon(getJobTypeName(job))}
            alt={getJobTypeName(job)}
            className="w-5 h-5 inline-block"
          />
          {getJobTypeName(job)}
        </div>

        {/* 🌾 Field Name */}
        <div>
          {isFieldJob
            ? job.fieldName
: [...new Set(job.fields?.filter(f => !f.isDetachedFromGroup).map(f => f.fieldName))].join(', ')
 || '—'}
        </div>

        {/* 🧪 Product Name */}
        <div>{job.products?.[0]?.productName || '—'}</div>

        {/* 📐 Acres + Passes */}
        <div className="flex flex-col">
          <div>
            {(() => {
              const isLeveeJob = (job.jobType?.name || '').toLowerCase().includes('levee') ||
                                 (job.jobType?.name || '').toLowerCase().includes('pack');

              if (isLeveeJob && Array.isArray(job.fields)) {
                let total = 0;
                job.fields.forEach(f => {
                  const crop = f.crop || f.crops?.[job.cropYear]?.crop || '';
                  if (crop.includes('Rice')) total += parseFloat(f.riceLeveeAcres || 0);
                  else if (crop.includes('Soybean')) total += parseFloat(f.beanLeveeAcres || 0);
                });
                return `${total.toFixed(1)} ac (Levee)`;
              }

              if (isFieldJob) {
                return `${job.acres?.toFixed?.(1) || '—'} ac`;
              }

              const total = Object.values(job.acres || {}).reduce((sum, val) => sum + (val || 0), 0);
              return `${total.toFixed(1)} ac`;
            })()}
          </div>

          {job.jobType?.parentName === 'Tillage' && job.passes && (
            <div>Passes: {job.passes}</div>
          )}
        </div>

       {/* 📌 Status + Link badge */}
<div className="flex items-center gap-2">
  <Badge variant={job.status?.toLowerCase()}>{job.status}</Badge>
  {job.linkedToJobId && (
    <Badge variant="outline">🔗 Grouped</Badge>
  )}
</div>

      </div>

     {/* 🧰 3-dot menu */}
{role !== 'viewer' && (
  <div>

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

              {/* 🗑️ Delete */}
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

              {/* 📄 PDF */}
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

              {/* 🔄 Toggle Status */}
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`block w-full px-4 py-2 text-sm text-left ${active ? 'bg-gray-100' : ''}`}
                  onClick={async () => {
  const newStatus = job.status === 'Planned' ? 'Completed' : 'Planned';

  if (isFieldJob) {
    const ref = doc(db, 'jobsByField', job.id);
    await setDoc(ref, { ...job, status: newStatus }, { merge: true });

    setFieldJobs(prev =>
      prev.map(j => (j.id === job.id ? { ...j, status: newStatus } : j))
    );

    // 🔁 Also update linked grouped job field if exists
    if (job.linkedToJobId) {
      const groupRef = doc(db, 'jobs', job.linkedToJobId);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        const groupData = groupSnap.data();
        const updatedFields = (groupData.fields || []).map(f =>
          f.id === job.fieldId ? { ...f, status: newStatus } : f
        );

        await setDoc(groupRef, { ...groupData, fields: updatedFields }, { merge: true });
      }
    }

  } else {
    // It's a master job — update it
    const ref = doc(db, 'jobs', job.id);
    await setDoc(ref, { ...job, status: newStatus }, { merge: true });

    setJobs(prev =>
      prev.map(j => (j.id === job.id ? { ...j, status: newStatus } : j))
    );

    // 🔁 Also update all related jobsByField
    const fieldSnap = await getDocs(collection(db, 'jobsByField'));
    const linked = fieldSnap.docs.filter(doc => doc.data().linkedToJobId === job.id);

    await Promise.all(
      linked.map(docSnap =>
        setDoc(doc(db, 'jobsByField', docSnap.id), {
          ...docSnap.data(),
          status: newStatus
        }, { merge: true })
      )
    );

    setFieldJobs(prev =>
      prev.map(j =>
        j.linkedToJobId === job.id ? { ...j, status: newStatus } : j
      )
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
)}
    </div>
  );
};


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
        fields: attachedFields
      };
    }
    return job;
  })
  .filter((job) => {
    const matchesStatus =
      filterStatus === 'All' || job.status === filterStatus;
const jobTypeName = typeof job.jobType === 'string' ? job.jobType : job.jobType?.name;
const matchesType =
  filterType === 'All' || getJobTypeName(job) === filterType;

    const matchesSearch = (() => {
      const fieldMatch = view === 'By Field'
        ? job.fieldName?.toLowerCase().includes(searchText.toLowerCase())
        : job.fields?.some(f => f.fieldName?.toLowerCase().includes(searchText.toLowerCase()));

      const productMatch = job.products?.some(p =>
        p.productName?.toLowerCase().includes(searchText.toLowerCase())
      );

      const typeMatch =
  (typeof job.jobType === 'string'
    ? job.jobType
    : job.jobType?.name || ''
  ).toLowerCase().includes(searchText.toLowerCase());


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


  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Jobs"
        actions={<Button onClick={() => navigate('/jobs/create')}><Plus className="mr-2" size={16} /> Create Job</Button>}
      />

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
      await handleDelete(id, true); // isFieldJob = true
    } else {
      // Also delete linked field jobs
      const fieldJobSnap = await getDocs(collection(db, 'jobsByField'));
      const linkedFieldJobs = fieldJobSnap.docs.filter(
        (doc) => doc.data().linkedToJobId === id
      );

      await Promise.all(
        linkedFieldJobs.map((docSnap) =>
          deleteDoc(doc(db, 'jobsByField', docSnap.id))
        )
      );

      await handleDelete(id, false); // isFieldJob = false
    }
  })
);

setJobs((prev) => prev.filter((j) => !selectedJobs.includes(j.id)));
setFieldJobs((prev) =>
  prev.filter((j) => !selectedJobs.includes(j.id) && !selectedJobs.includes(j.linkedToJobId))
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

  {/* 📎 Sort buttons */}
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
    sortKey === key
      ? 'bg-blue-600 text-white'
      : 'text-gray-600 hover:bg-gray-100'
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
{view === 'By Field' && (
  <Menu as="div" className="relative">
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
     {[...new Set(
  [...jobs, ...fieldJobs]
    .map(j => typeof j.jobType === 'string' ? j.jobType : j.jobType?.name)
    .filter(Boolean)
)].map((type) => (
  <option key={type} value={type}>{type}</option>
))}

      </select>
    </div>
  )}
</div>

</div>

  <div className={viewMode === 'cards' ? '...' : 'flex flex-col divide-y border rounded'}>

  {viewMode === 'list' && (
    <div className="flex items-center justify-between border-b py-2 px-2 text-sm font-semibold text-gray-700 bg-gray-50">
     {role !== 'viewer' && (
  <input
    type="checkbox"
    checked={
      selectedJobs.length > 0 &&
      selectedJobs.length === jobsToShow.length
    }
    onChange={(e) => {
      if (e.target.checked) {
        setSelectedJobs(jobsToShow.map((j) => j.id));
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

 {jobsToShow.map(job =>
  viewMode === 'cards'
    ? <React.Fragment key={job.id}>{renderJobCard(job, view === 'By Field')}</React.Fragment>
    : <React.Fragment key={job.id}>{renderListItem(job, view === 'By Field')}</React.Fragment>
)}

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
}  // closing Jobs component



