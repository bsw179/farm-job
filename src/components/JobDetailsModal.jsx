import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Badge } from '@/components/ui/Badge'; // if used


function JobDetailsModal({ job, onClose }) {
  if (!job) return null;

  // 🧠 Utilities
  const getJobTypeName = (job) =>
    typeof job.jobType === 'string' ? job.jobType : job.jobType?.name || '';

  const [fieldBoundary, setFieldBoundary] = useState(null);
  const [fieldBoundaries, setFieldBoundaries] = useState([]);

  // 📦 Load Field Boundary
  useEffect(() => {
const fieldId = job?.fieldId || job?.fields?.[0]?.id;
if (!fieldId) return;

    const loadBoundary = async () => {
      try {
        const fieldRef = doc(db, 'fields', fieldId);
        const snap = await getDoc(fieldRef);
        if (!snap.exists()) return;

        let geo = snap.data()?.boundary?.geojson;
        if (typeof geo === 'string') {
          try {
            geo = JSON.parse(geo);
          } catch {
            console.warn('❌ Could not parse field geojson');
            return;
          }
        }

        if (geo?.type === 'Feature') geo = geo.geometry;
        setFieldBoundary(geo);
        setFieldBoundaries([geo]);

      } catch (err) {
        console.error('❌ Error loading field boundary', err);
      }
    };

    loadBoundary();
  }, [job]);
useEffect(() => {
  const loadAllBoundaries = async () => {
    if (!Array.isArray(job.fields)) return;

    const boundaries = [];
    const polygons = [];

    await Promise.all(
      job.fields.map(async (f) => {
        try {
          // 🔵 Pull static boundary from Fields
          const fieldSnap = await getDoc(doc(db, 'fields', f.fieldId || f.id));
          if (fieldSnap.exists()) {
            let geo = fieldSnap.data()?.boundary?.geojson || fieldSnap.data()?.boundary;
            if (typeof geo === 'string') {
              try { geo = JSON.parse(geo); } catch { geo = null; }
            }
            if (geo?.type === 'Feature') geo = geo.geometry;
            if (geo) boundaries.push(geo);
          }

          // 🟢 Pull drawn polygon from JobsByField
          const jobByFieldId = f.jobId || `${job.id}_${f.fieldId || f.id}`;
          const jobFieldSnap = await getDoc(doc(db, 'jobsByField', jobByFieldId));
          if (jobFieldSnap.exists()) {
            let drawn = jobFieldSnap.data()?.drawnPolygon;
            if (typeof drawn === 'string') {
              try { drawn = JSON.parse(drawn); } catch { drawn = null; }
            }
            if (drawn?.type === 'Feature') drawn = drawn.geometry;
            if (drawn?.type === 'Polygon') polygons.push(drawn);
          }

        } catch (err) {
          console.error('❌ Error loading field or polygon', err);
        }
      })
    );

    setFieldBoundaries(boundaries);
    setParsedPolygons(polygons);
  };

  loadAllBoundaries();
}, [job]);


  // 🧾 Parse Drawn Polygon + Boundary
let parsedPolygons = [];

try {
  if (Array.isArray(job.fields)) {
    job.fields.forEach((f) => {
      let poly = f.drawnPolygon;
      if (typeof poly === 'string') {
        try {
          poly = JSON.parse(poly);
        } catch {
          return;
        }
      }

      if (poly?.type === 'Feature') {
        parsedPolygons.push(poly.geometry);
      } else if (poly?.type === 'Polygon') {
        parsedPolygons.push(poly);
      }
    });
  } else if (job.drawnPolygon) {
    let poly = job.drawnPolygon;
    if (typeof poly === 'string') {
      try {
        poly = JSON.parse(poly);
      } catch {
        poly = null;
      }
    }
    if (poly?.type === 'Feature') {
      parsedPolygons.push(poly.geometry);
    } else if (poly?.type === 'Polygon') {
      parsedPolygons.push(poly);
    }
  }
} catch {
  console.warn('Failed to parse drawnPolygon');
}



  // 🖼️ Modal Layout
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white rounded-lg p-4 w-full max-w-md h-[80vh] overflow-y-auto shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          ✖
        </button>

        {/* 📌 Header */}
        <h2 className="text-lg font-semibold mb-2">{getJobTypeName(job)}</h2>
        <p className="text-sm text-gray-600 mb-1">
  {job.cropYear} • {Array.isArray(job.fields)
    ? job.fields.map(f => f.fieldName).filter(Boolean).join(', ')
    : job.fieldName || 'Unnamed Field'}
</p>


        {/* 📅 Date + Status */}
        <div className="text-xs text-gray-600 mb-2 space-x-2">
          {job.jobDate && <span><span className="font-medium">Date:</span> {job.jobDate}</span>}
          <Badge variant={job.status?.toLowerCase()}>{job.status}</Badge>
        </div>

        {/* 🧪 Products */}
        {job.products?.length > 0 && (
          <div className="mb-4">
            <div className="grid grid-cols-2 font-semibold border-b pb-1 mb-1 text-xs text-gray-700">
              <span>Product</span>
              <span>Rate</span>
            </div>
            {job.products.map((p, i) => (
              <div
                key={i}
                className="grid grid-cols-2 gap-2 text-sm text-gray-800 border-b py-1"
              >
                <span>{p.productName || p.name || '—'}</span>
                <span>{p.rate || '—'} {p.unit || ''}</span>
              </div>
            ))}
          </div>
        )}

        {/* 👷 Vendor / Applicator */}
        {(job.vendor || job.applicator) && (
          <div className="mb-4 text-sm text-gray-700 space-y-1">
            {job.vendor && <p><span className="font-medium">Vendor:</span> {job.vendor}</p>}
            {job.applicator && <p><span className="font-medium">Applicator:</span> {job.applicator}</p>}
          </div>
        )}

        {/* 📐 Acres + Passes */}
        <div className="text-xs text-gray-600 mb-4 space-y-1">
         <p>
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
      const total = job.fields.reduce((sum, f) => sum + (parseFloat(f.acres) || 0), 0);
      return `${total.toFixed(2)} acres`;
    }

    return `${job.acres ?? job.drawnAcres ?? '—'} acres`;
  })()}
</p>


          {job.jobType?.parentName === 'Tillage' && job.passes && (
            <p>Passes: {job.passes}</p>
          )}
        </div>

        {/* 🗺️ Map */}
       <div className="mt-4">
  {(() => {
    const cleanedFieldBoundaries = fieldBoundaries.filter(b => b?.type === 'Polygon' && Array.isArray(b.coordinates));
    const cleanedParsedPolygons = parsedPolygons.filter(p => p?.type === 'Polygon' && Array.isArray(p.coordinates));

    return (cleanedFieldBoundaries.length > 0 || cleanedParsedPolygons.length > 0)
      ? renderBoundarySVG(cleanedFieldBoundaries, cleanedParsedPolygons)
      : <div className="text-gray-400 text-sm text-center">No map available</div>;
  })()}
</div>


        {/* 📝 Notes */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">Notes</label>
          <div className="text-sm text-gray-700 whitespace-pre-line border border-gray-200 rounded p-2 bg-gray-50">
            {job.notes || '—'}
          </div>
        </div>

        {/* 📦 Product Totals */}
        {job.products?.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h4 className="font-semibold text-sm mb-2">Product Totals</h4>
            {job.products.map((p, i) => {
              const rate = parseFloat(p.rate);
              const unit = p.unit?.toLowerCase() || '';
              const crop = p.crop?.toLowerCase?.() || '';
              const acres = Array.isArray(job.fields)
  ? job.fields.reduce((sum, f) => sum + (parseFloat(f.acres) || 0), 0)
  : (job.acres || job.drawnAcres || 0);

              const totalAmount = rate * acres;
              let display = '';

              if (['seeds/acre', 'population'].includes(unit)) {
                const seedsPerUnit = crop.includes('rice') ? 900000 : crop.includes('soybean') ? 140000 : 1000000;
                const totalSeeds = rate * acres;
                const units = totalSeeds / seedsPerUnit;
                display = `${units.toFixed(1)} units`;
              } else if (['lbs/acre'].includes(unit)) {
                const lbsPerBushel = crop.includes('rice') ? 45 : crop.includes('soybean') ? 60 : 50;
                const bushels = totalAmount / lbsPerBushel;
                display = `${bushels.toFixed(1)} bushels`;
              } else if (['fl oz/acre', 'oz/acre'].includes(unit)) {
                const gal = totalAmount / 128;
                display = `${gal.toFixed(2)} gallons`;
              } else if (unit === 'pt/acre') {
                const gal = totalAmount / 8;
                display = `${gal.toFixed(2)} gallons`;
              } else if (unit === 'qt/acre') {
                const gal = totalAmount / 4;
                display = `${gal.toFixed(2)} gallons`;
              } else if (unit === 'oz dry/acre') {
                const lbs = totalAmount / 16;
                display = `${lbs.toFixed(2)} lbs`;
              } else if (unit === '%v/v') {
                const water = parseFloat(job.waterVolume || 0);
                const gal = (rate / 100) * water * acres;
                display = `${gal.toFixed(2)} gallons`;
              } else if (unit === 'tons/acre') {
                display = `${totalAmount.toFixed(2)} tons`;
              } else {
                display = `${totalAmount.toFixed(1)} ${unit.replace('/acre', '').trim()}`;
              }

              return (
                <div key={i} className="text-sm text-gray-700">
                  {p.productName || p.name || 'Unnamed'} → <span className="font-mono">{display}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


function renderBoundarySVG(baseGeometries, overlayGeoJSONList) {
  if (!Array.isArray(baseGeometries) || baseGeometries.length === 0) return null;

  const boxSize = 300;
  const margin = 10;

  const allCoords = [
  ...baseGeometries.flatMap(g => g?.coordinates?.[0] || []),
  ...(overlayGeoJSONList || []).flatMap(g => g?.coordinates?.[0] || [])
];


  const bounds = allCoords.reduce((acc, [lng, lat]) => ({
    minX: Math.min(acc.minX, lng),
    maxX: Math.max(acc.maxX, lng),
    minY: Math.min(acc.minY, lat),
    maxY: Math.max(acc.maxY, lat),
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

  const width = bounds.maxX - bounds.minX || 1;
  const height = bounds.maxY - bounds.minY || 1;
  const scale = (boxSize - margin * 2) / Math.max(width, height);
  const xOffset = (boxSize - width * scale) / 2;
  const yOffset = (boxSize - height * scale) / 2;

  const project = ([lng, lat]) => ({
    x: (lng - bounds.minX) * scale + xOffset,
    y: boxSize - ((lat - bounds.minY) * scale + yOffset),
  });

  const pathFromCoords = (coords) =>
    coords.map((pt, i) => {
      const { x, y } = project(pt);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ') + ' Z';

  const paths = [];

  // 🟥 Field boundaries (base polygons)
  baseGeometries.forEach(geo => {
    if (geo?.coordinates?.[0]) {
      paths.push({
        type: 'base',
        d: pathFromCoords(geo.coordinates[0]),
      });
    }
  });

  // 🟩 Drawn overlays (application zones)
  (overlayGeoJSONList || []).forEach(overlay => {
    const poly = overlay?.type === 'Feature' ? overlay.geometry : overlay;
    if (poly?.coordinates?.[0]) {
      paths.push({
        type: 'overlay',
        d: pathFromCoords(poly.coordinates[0]),
      });
    }
  });

  return (
    <svg viewBox={`0 0 ${boxSize} ${boxSize}`} className="w-full max-w-xs bg-white border rounded shadow mx-auto">
   {paths.map((p, i) => (
    <path
      key={i}
      d={p.d}
      fill={
        p.type === 'overlay'
          ? '#34D399'
          : overlayGeoJSONList?.length
            ? '#F87171'
            : '#34D399'
      }
      fillOpacity={p.type === 'overlay' ? 0.6 : 0.2}
      stroke={p.type === 'overlay' ? '#047857' : '#4B5563'}
      strokeWidth={p.type === 'overlay' ? 2 : 1.5}
    />
  ))}
</svg>
  );
}
export default JobDetailsModal;
