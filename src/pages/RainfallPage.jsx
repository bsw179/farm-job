// src/pages/RainfallPage.jsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { format, subDays } from 'date-fns';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { CloudRain, ThermometerSun } from 'lucide-react';
import { getDisplayCrop } from '@/lib/utils'; // if you already use this

export default function RainfallPage() {
  const [fields, setFields] = useState([]);
  const [rainfallLogs, setRainfallLogs] = useState([]);
  const [forecastLogs, setForecastLogs] = useState([]);
  const [cropTypes, setCropTypes] = useState([]);
  const [sortBy, setSortBy] = useState('field');

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

    const fetchForecasts = async () => {
      const snap = await getDocs(collection(db, 'forecastLogs'));
      setForecastLogs(snap.docs.map(doc => doc.data()));
    };

    const fetchCropTypes = async () => {
      const snap = await getDocs(collection(db, 'cropTypes'));
      setCropTypes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    fetchFields();
    fetchRain();
    fetchForecasts();
    fetchCropTypes();
  }, []);

  const getRainTotals = (fieldId) => {
    const now = new Date();
    const yesterday = format(subDays(now, 1), 'yyyy-MM-dd');
    const weekAgo = format(subDays(now, 7), 'yyyy-MM-dd');
    const month = format(now, 'yyyy-MM');

    const logs = rainfallLogs.filter(r => r.fieldId === fieldId);

    const rainToday = logs
      .filter(r => r.date?.startsWith(format(now, 'yyyy-MM-dd')))
      .reduce((sum, r) => sum + (r.precip || 0), 0);

    const rainYesterday = logs
      .filter(r => r.date?.startsWith(yesterday))
      .reduce((sum, r) => sum + (r.precip || 0), 0);

    const rain48 = rainToday + rainYesterday;

    const rain7 = logs
      .filter(r => r.date >= weekAgo)
      .reduce((sum, r) => sum + (r.precip || 0), 0);

    const rainMonth = logs
      .filter(r => r.date.startsWith(month))
      .reduce((sum, r) => sum + (r.precip || 0), 0);

    return { rainToday, rain48, rain7, rainMonth };
  };

  const getForecastForField = (fieldId) => {
    return forecastLogs
      .filter(f => f.fieldId === fieldId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
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

      if (sortBy === 'rain24') return rainB.rainToday - rainA.rainToday;
      if (sortBy === 'rain7') return rainB.rain7 - rainA.rain7;
      return (a.fieldName || '').localeCompare(b.fieldName || '');
    });

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <PageHeader title="🌧️ Rainfall by Field" />
      <div className="flex flex-wrap gap-2 mb-6">
        <Button onClick={() => setSortBy('field')}>Sort: A-Z</Button>
        <Button onClick={() => setSortBy('rain24')}>Sort: Most Rain 24hr</Button>
        <Button onClick={() => setSortBy('rain7')}>Sort: Most Rain 7 Days</Button>
      </div>

      {sortedFields.map(field => {
        const { rainToday, rain48, rain7, rainMonth } = getRainTotals(field.id);
        const crop = getDisplayCrop?.(field, field.cropYear) || '';
        const cropIcon = cropTypes?.find(c => c.name === crop)?.icon || '';
        const forecasts = getForecastForField(field.id);
        const todayForecast = forecasts.find(f => f.date === format(new Date(), 'yyyy-MM-dd'));

        return (
          <Card key={field.id} className="mb-5 p-5 hover:shadow-lg transition relative">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-lg">
                {field.fieldName || 'Unnamed Field'}
                {cropIcon && <span className="ml-2 text-gray-500">{cropIcon} {crop}</span>}
              </div>

              <div className="flex flex-col items-end text-sm">
                {todayForecast && (
                  <div className="flex items-center text-sky-700 mb-1">
                    <ThermometerSun className="w-4 h-4 mr-1" />
                    {todayForecast.tempmin.toFixed(0)}° / {todayForecast.tempmax.toFixed(0)}°
                  </div>
                )}
                <div className={`flex flex-col items-center px-2 py-1 rounded-full ${rainToday > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  <div className="flex items-center gap-1">
                    <CloudRain className="w-4 h-4" />
                    <span className="text-sm font-semibold">Today: {rainToday.toFixed(2)} in</span>
                  </div>
                  <span className="text-[10px] text-gray-500">Since Midnight</span>
                </div>
              </div>
            </div>

            {forecasts.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-gray-700 mb-2">15-Day Forecast</div>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-600">
  {forecasts.map(f => {
    const rainAmount = f.forecastInches || 0;
    const rainClass =
      rainAmount > 0.1
        ? 'text-blue-700 font-semibold'
        : rainAmount === 0
          ? 'text-gray-400'
          : '';

    return (
      <div key={f.date} className="flex items-center gap-2">
        <div className="w-12">{f.date.slice(5)}</div>
        <div className={rainClass}>{rainAmount.toFixed(2)} in</div>
      </div>
    );
  })}
</div>



              </div>
            )}

            <div className="mt-4 text-sm text-gray-700">
              Last 48 Hours: <span className="font-semibold">{rain48.toFixed(2)} in</span><br />
              Last 7 Days: <span className="font-semibold">{rain7.toFixed(2)} in</span><br />
              Month-to-Date: <span className="font-semibold">{rainMonth.toFixed(2)} in</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
