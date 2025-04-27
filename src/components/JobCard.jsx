// 🔹 JobCard.jsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { getJobTypeIcon } from '@/utils/getJobTypeIcon';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Pencil, Trash2, FileText } from 'lucide-react';
import { useUser } from '@/context/UserContext';

export default function JobCard({ job, isFieldJob, onSelect, onDelete }) {
  const navigate = useNavigate();
  const { role } = useUser();

  const getJobTypeName = (job) =>
    typeof job.jobType === 'string' ? job.jobType : job.jobType?.name || '';

  const formatShortDate = (isoString) => {
    if (!isoString) return '—';
    const [year, month, day] = isoString.split('-');
    const localDate = new Date(Number(year), Number(month) - 1, Number(day));
    return localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
              src={getJobTypeIcon(getJobTypeName(job))}
              alt={getJobTypeName(job)}
              className="w-4 h-4 inline-block"
            />
            {getJobTypeName(job)}
          </div>

          <div className="text-xs text-gray-500 leading-tight">
            {job.cropYear} • {isFieldJob ? job.fieldName : [...new Set(job.fields?.map(f => f.fieldName))].join(', ')}
            <br />
            {formatShortDate(job.jobDate)}
          </div>
        </div>

        {/* 🛠 Actions */}
        {role !== 'viewer' && (
          <div className="flex gap-2">
         <Button
  size="icon"
  variant="ghost"
  onClick={async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (isFieldJob) {
        navigate(`/jobs/field/${job.id}`);
      } else {
       const snap = await getDocs(query(
  collection(db, 'jobsByField'),
  where('linkedToJobId', '==', job.id)
));

const freshFields = snap.docs
  .map(doc => ({ id: doc.id, ...doc.data() }))
  .filter(f => !f.isDetachedFromGroup);


        if (!freshFields.length) {
          alert('No fields found for this grouped job.');
          return;
        }

        navigate('/jobs/summary', {
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
            notes: job.notes || '',
            passes: job.passes || 1,
            waterVolume: job.waterVolume || ''
          }
        });
      }
    } catch (error) {
      console.error('❌ Failed to load grouped fields:', error);
      alert('Something went wrong loading fields. Try again.');
    }
  }}
>
  <Pencil size={16} />
</Button>



            <Button size="icon" variant="ghost" onClick={(e) => {
              e.stopPropagation();
              onDelete(job.id, isFieldJob);
            }}>
              <Trash2 size={16} />
            </Button>

            <Button size="icon" variant="ghost" onClick={(e) => {
              e.stopPropagation();
              // Optional: trigger PDF export
            }}>
              <FileText size={16} />
            </Button>
          </div>
        )}
      </div>

      {/* 🟦 Card Content */}
      <div className="text-sm text-gray-600 mt-2">
        {(() => {
          const p = job.products?.[0];
          if (!p) return '—';
          return `${p.productName || p.name || '—'} • ${p.rate || ''} ${p.unit || ''}`;
        })()}
      </div>

 {/* 🏷️ Badges and Acres */}
<div className="flex flex-col gap-0.5 text-xs text-gray-500 mt-2">
  <div className="flex items-center gap-2">
    <Badge variant={job.status?.toLowerCase()}>{job.status}</Badge>

    {job.linkedToJobId && (
      <Badge variant="outline">🔗 Grouped</Badge>
    )}
  </div>

  <div className="text-xs text-gray-500">
  {(() => {
    const isLeveeJob = (job.jobType?.name || '').toLowerCase().includes('levee') ||
                       (job.jobType?.name || '').toLowerCase().includes('pack');

    const crop = job.crop || '';

    if (isLeveeJob && Array.isArray(job.fields)) {
      let total = 0;
      job.fields.forEach(f => {
        const crop = f.crop || f.crops?.[job.cropYear]?.crop || '';
        if (crop.includes('Rice')) total += parseFloat(f.riceLeveeAcres || 0);
        else if (crop.includes('Soybean')) total += parseFloat(f.beanLeveeAcres || 0);
      });
      return `${total.toFixed(1)} acres (Levee)`;
    }

    if (Array.isArray(job.fields)) {
      const total = job.fields.reduce((sum, f) =>
        sum + (parseFloat(f.acres) || 0), 0
      );
      return `${total.toFixed(2)} acres`;
    }

    return `${job.acres ?? job.drawnAcres ?? job.gpsAcres ?? '—'} acres`;
  })()}
</div>

</div>

    </div>
  );
}
