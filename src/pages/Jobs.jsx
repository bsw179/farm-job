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

import { CropYearContext } from '../context/CropYearContext';


export default function Jobs() {
  const { cropYear } = useContext(CropYearContext);
  const [view, setView] = useState('Grouped');
  const [jobs, setJobs] = useState([]);
  const [fieldJobs, setFieldJobs] = useState([]);
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
          <div className="text-sm font-semibold text-blue-700">{job.jobType}</div>
          <div className="text-xs text-gray-500">{job.cropYear} • {isFieldJob ? job.fieldName : job.fields?.join(', ')}</div>
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

          <Button size="icon" variant="ghost" onClick={() => handleDelete(job.id, isFieldJob)}><Trash2 size={16} /></Button>
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

  const filteredJobs = jobs.filter((job) => job.cropYear === cropYear);
  const filteredFieldJobs = fieldJobs.filter((job) => job.cropYear === cropYear);

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Jobs"
        actions={<Button onClick={() => navigate('/jobs/create')}><Plus className="mr-2" size={16} /> Create Job</Button>}
      />

      <Tabs defaultValue="Grouped" value={view} onValueChange={setView} className="mb-4">
        <Tab value="Grouped">Grouped</Tab>
        <Tab value="By Field">By Field</Tab>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(view === 'Grouped' ? filteredJobs : filteredFieldJobs).map((job) => renderJobCard(job, view === 'By Field'))}
      </div>
    </div>
  );
}
