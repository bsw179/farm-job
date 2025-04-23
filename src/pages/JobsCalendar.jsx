import React, { useEffect, useState } from 'react';
import JobDetailsModal from "@/components/JobDetailsModal";

import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';
import '../styles/CustomCalendar.css'; // Optional for styling overrides
import { getJobTypeIcon } from '@/utils/getJobTypeIcon';

export default function JobsCalendar() {
  const [jobs, setJobs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedJob, setSelectedJob] = useState(null);
const [selectedFarm, setSelectedFarm] = useState('');
const [selectedField, setSelectedField] = useState('');
const [selectedCrop, setSelectedCrop] = useState('');
const [selectedJobType, setSelectedJobType] = useState('');
const [dayPreviewJobs, setDayPreviewJobs] = useState([]);
const [previewDate, setPreviewDate] = useState(null);

  useEffect(() => {
    const loadJobs = async () => {
      const snap = await getDocs(collection(db, 'jobsByField'));
      const jobsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJobs(jobsData);
    };

    loadJobs();
  }, []);

  // Group jobs by formatted date
const filteredJobs = jobs.filter(j => {
  return (
    (!selectedFarm || j.farmName === selectedFarm) &&
    (!selectedField || j.fieldName === selectedField) &&
    (!selectedCrop || j.crop === selectedCrop) &&
    (!selectedJobType || j.jobType?.name === selectedJobType)
  );
});

const jobsByDate = filteredJobs.reduce((acc, job) => {
    const dateKey = format(new Date(job.jobDate), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(job);
    return acc;
  }, {});

  // Custom tile content for each day
  const renderTileContent = ({ date, view }) => {
    const key = format(date, 'yyyy-MM-dd');
    const dayJobs = jobsByDate[key] || [];

    if (view === 'month' && dayJobs.length > 0) {
      return (
        <ul className="calendar-job-list">
          {dayJobs.slice(0, 2).map(job => (
           <li key={job.id} className="calendar-job-snippet">
  {selectedField && selectedField !== ''
  ? `${job.jobType?.name || '—'}`
  : `${job.fieldName} (${job.jobType?.name || '—'})`}

</li>

          ))}
          {dayJobs.length > 2 && (
            <li className="calendar-job-snippet text-xs text-gray-500">+{dayJobs.length - 2} more</li>
          )}
        </ul>
      );
    }

    return null;
  };

  return (

    
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Jobs Calendar</h1>
    
    <div className="mb-4 flex flex-wrap gap-4">
  <select value={selectedFarm} onChange={e => setSelectedFarm(e.target.value)} className="border rounded px-3 py-2">
    <option value="">All Farms</option>
    {[...new Set(jobs.map(j => j.farmName))].filter(Boolean).map(farm => (
      <option key={farm} value={farm}>{farm}</option>
    ))}
  </select>

  <select value={selectedField} onChange={e => setSelectedField(e.target.value)} className="border rounded px-3 py-2">
    <option value="">All Fields</option>
    {[...new Set(jobs.map(j => j.fieldName))].filter(Boolean).map(field => (
      <option key={field} value={field}>{field}</option>
    ))}
  </select>

  <select value={selectedCrop} onChange={e => setSelectedCrop(e.target.value)} className="border rounded px-3 py-2">
    <option value="">All Crops</option>
    {[...new Set(jobs.map(j => j.crop))].filter(Boolean).map(crop => (
      <option key={crop} value={crop}>{crop}</option>
    ))}
  </select>

  <select value={selectedJobType} onChange={e => setSelectedJobType(e.target.value)} className="border rounded px-3 py-2">
    <option value="">All Job Types</option>
    {[...new Set(jobs.map(j => j.jobType?.name))].filter(Boolean).map(type => (
      <option key={type} value={type}>{type}</option>
    ))}
  </select>
</div>

      <Calendar
        value={selectedDate}
onClickDay={(date) => {
  const key = format(date, 'yyyy-MM-dd');
  const jobsForDay = jobsByDate[key] || [];
  setPreviewDate(key);
  setDayPreviewJobs(jobsForDay);
}}
        tileContent={renderTileContent}
        className="w-full rounded shadow"
      />

      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
      {dayPreviewJobs.length > 0 && (
  <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 relative">
      <button
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        onClick={() => {
          setDayPreviewJobs([]);
          setPreviewDate(null);
        }}
      >
        ✖
      </button>

      <h2 className="text-lg font-semibold mb-4">Jobs on {previewDate}</h2>

    <ul className="space-y-2 max-h-96 overflow-y-auto">
  {dayPreviewJobs.map(job => (
    <li
      key={job.id}
      className="p-2 rounded hover:bg-gray-100 cursor-pointer text-sm flex items-center justify-between"
      onClick={() => {
        setSelectedJob(job);
        setDayPreviewJobs([]);
        setPreviewDate(null);
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            job.status === 'Completed' ? 'bg-green-500' : 'bg-yellow-400'
          }`}
        />
        <img
          src={getJobTypeIcon(job.jobType)}
          alt={job.jobType?.name || 'Job'}
          className="w-4 h-4"
        />
        <span className="font-medium">{job.jobType?.name || '—'}</span>
      </div>

      <span className="text-gray-400 text-sm">{job.fieldName}</span>
    </li>
  ))}
</ul>

    </div>
  </div>
)}

    </div>
  );
}
