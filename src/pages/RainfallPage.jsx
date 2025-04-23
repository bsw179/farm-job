// src/pages/RainfallPage.jsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { format, subDays } from 'date-fns';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CloudRain } from 'lucide-react';
import { getDisplayCrop } from '@/lib/utils'; // if you already use this

export default function RainfallPage() {
  const [fields, setFields] = useState([]);
  const [rainfallLogs, setRainfallLogs] = useState([]);
  const [sortBy, setSortBy] = useState('field'); // 'field' | 'rain24' | 'rain7'
const [cropTypes, setCropTypes] = useState([]);

  useEffect(() => {
    const fetchFields = async () => {
      const snap = await getDocs(collection(db, 'fields'));
      setFields(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    const fetchRain = async () => {
      const q = query(collection(db, 'rainfallLogs'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setRainfallLogs(snap.docs.map(doc => doc.data()));
    };

    fetchFields();
    fetchRain();
  }, []);
useEffect(() => {
  const fetchCropTypes = async () => {
    const snap = await getDocs(collection(db, 'cropTypes'));
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCropTypes(data);
  };

  fetchCropTypes();
}, []);

  const getRainTotals = (fieldId) => {
    const now = new Date();
    const dayAgo = format(subDays(now, 1), 'yyyy-MM-dd');
    const weekAgo = format(subDays(now, 7), 'yyyy-MM-dd');
    const month = format(now, 'yyyy-MM');

    const logs = rainfallLogs.filter(r => r.fieldId === fieldId);

    const rain24 = logs
  .filter(r => r.date?.startsWith(dayAgo))
  .reduce((sum, r) => sum + (r.inches || 0), 0);

    const rain7 = logs
      .filter(r => r.date >= weekAgo)
      .reduce((sum, r) => sum + (r.inches || 0), 0);

    const rainMonth = logs
      .filter(r => r.date.startsWith(month))
      .reduce((sum, r) => sum + (r.inches || 0), 0);

    return { rain24, rain7, rainMonth };
  };

  const sortedFields = [...fields]
  .filter(field => {
    const raw = field.boundary?.geojson || field.boundary;
    try {
      if (typeof raw === 'string') JSON.parse(raw);
      return !!raw;
    } catch {
      return false;
    }
  })
  .sort((a, b) => {
    const rainA = getRainTotals(a.id);
    const rainB = getRainTotals(b.id);

    if (sortBy === 'rain24') return rainB.rain24 - rainA.rain24;
    if (sortBy === 'rain7') return rainB.rain7 - rainA.rain7;
    return (a.fieldName || '').localeCompare(b.fieldName || '');
  });


  return (
    <div className="p-4 max-w-4xl mx-auto">
      <PageHeader title="Rainfall by Field" />
      <div className="flex gap-2 mb-4">
        <Button onClick={() => setSortBy('field')}>Sort: A-Z</Button>
        <Button onClick={() => setSortBy('rain24')}>Sort: Last 24hr</Button>
        <Button onClick={() => setSortBy('rain7')}>Sort: Last 7 Days</Button>
      </div>

      {sortedFields.map(field => {
  const { rain24, rain7, rainMonth } = getRainTotals(field.id);
  const crop = getDisplayCrop?.(field, field.cropYear) || ''; // adjust if needed
  const cropIcon = cropTypes?.find(c => c.name === crop)?.icon || '';

  return (
    <Card key={field.id} className="mb-3 p-4 shadow">
      <div className="flex items-center justify-between mb-1">
        <div className="font-semibold">
          {field.fieldName || 'Unnamed Field'} {cropIcon && <span className="ml-2">{cropIcon} {crop}</span>}
        </div>
        <div className="flex items-center gap-1 text-sky-700 bg-sky-100 text-xs px-2 py-1 rounded-full">
          <CloudRain className="w-4 h-4" /> {/* Make it bigger here */}
          {rain24.toFixed(2)} in
        </div>
      </div>
      <div className="text-sm text-gray-600">Last 7 Days: {rain7.toFixed(2)} in</div>
      <div className="text-sm text-gray-600">Month-to-Date: {rainMonth.toFixed(2)} in</div>
    </Card>
  );
})}

    </div>
  );
}
