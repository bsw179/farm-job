// 🔹 Imports
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import { saveJob } from '../utils/saveJob'; // NEW!
import Select from 'react-select';
import ProductComboBox from '../components/ProductComboBox';
import EditAreaModal from "../components/EditAreaModal";
import EditJobPolygonForCreate from "../pages/EditJobPolygonForCreate";

// 🔹 Component Setup
export default function JobSummaryPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    jobType: initialJobType,
    cropYear = new Date().getFullYear(),
    selectedFields: initialSelectedFields = []
  } = location.state || {};

  const [jobType, setJobType] = useState(() => location.state?.isEditing ? initialJobType : '');
  const [fields, setFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState(initialSelectedFields);
  const [jobDate, setJobDate] = useState('');
  const [jobStatus, setJobStatus] = useState('Planned');
  const [saving, setSaving] = useState(false);
  const [shouldGeneratePDF, setShouldGeneratePDF] = useState(false);
  const [vendor, setVendor] = useState(location.state?.vendor || '');
  const [applicator, setApplicator] = useState(location.state?.applicator || '');
  const [vendors, setVendors] = useState([]);
  const [applicators, setApplicators] = useState([]);
  const [editableProducts, setEditableProducts] = useState(location.state?.products || []);
  const [productsList, setProductsList] = useState([]);
  const [jobTypesList, setJobTypesList] = useState([]);
  const [waterVolume, setWaterVolume] = useState('');
  const [isEditing, setIsEditing] = useState(location.state?.isEditing || false);
  const [jobId, setJobId] = useState(location.state?.jobId || doc(collection(db, 'jobs')).id);
  const [notes, setNotes] = useState(location.state?.notes || '');
  const [passes, setPasses] = useState(location.state?.passes || 1);
  const [showEditAreaModal, setShowEditAreaModal] = useState(false);
  const [fieldToEdit, setFieldToEdit] = useState(null);




  const baseButton = "inline-flex items-center px-4 py-2 rounded shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1";
  const primaryBtn = `${baseButton} bg-green-600 text-white hover:bg-green-700`;
  const blueLinkBtn = "text-blue-600 hover:text-blue-800 underline text-sm";
  const redLinkBtn = "text-red-600 hover:text-red-800 underline text-sm";  
  const isLeveeJob = jobType?.name?.toLowerCase().includes('levee') || jobType?.name?.toLowerCase().includes('pack');

    const totalJobAcres = fields.reduce((sum, f) => {
    const crop = f.crop || f.crops?.[cropYear]?.crop || '';

    if (isLeveeJob) {
      if (crop === 'Rice') return sum + (parseFloat(f.riceLeveeAcres) || 0);
      if (crop === 'Soybeans') return sum + (parseFloat(f.beanLeveeAcres) || 0);
    }

    return sum + (
      !isNaN(parseFloat(f.acres)) ? parseFloat(f.acres)
      : !isNaN(parseFloat(f.drawnAcres)) ? parseFloat(f.drawnAcres)
      : !isNaN(parseFloat(f.gpsAcres)) ? parseFloat(f.gpsAcres)
      : 0
    );
  }, 0);

    const requiresProducts = ['Seeding', 'Spraying', 'Fertilizing'].includes(
    jobType?.parentName
  );

  const selectedProductType = jobType?.productType || '';
  const requiresWater = jobType?.parentName === 'Spraying';
const handleSavePolygon = (updatedField) => {
  setSelectedFields(prevFields =>
    prevFields.map(f =>
      f.id === updatedField.id ? { ...f, ...updatedField } : f
    )
  );
};

    useEffect(() => {
    if (!location.state?.isEditing && !jobDate) {
      const today = new Date().toISOString().split('T')[0];
      setJobDate(today);
    }
  }, [location.state, jobDate]);

    useEffect(() => {
    const loadData = async () => {
      const [vendorSnap, applicatorSnap, productSnap, jobTypeSnap] = await Promise.all([
        getDocs(collection(db, 'vendors')),
        getDocs(collection(db, 'applicators')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'jobTypes'))
      ]);

      setVendors(vendorSnap.docs.map(doc => doc.data().name));
      setApplicators(applicatorSnap.docs.map(doc => doc.data().name));
      setProductsList(productSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const rawTypes = jobTypeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const flattenedTypes = rawTypes.flatMap(type =>
        (type.subTypes || []).map(sub => ({
          ...sub,
          parentName: type.name
        }))
      );

      setJobTypesList(flattenedTypes);

      if (initialJobType) {
        setJobType(initialJobType);
      }
    };

    loadData();
  }, []);

    useEffect(() => {
  const loadJob = async () => {
    const jobId = location.state?.jobId;
    const editing = location.state?.isEditing;

    if (!editing || !jobId) return;

    setIsEditing(true);

    const jobDoc = await getDoc(doc(db, 'jobs', jobId));
    if (!jobDoc.exists()) return;

    const jobData = jobDoc.data();
    setJobType(jobData.jobType || '');
    setJobDate(jobData.jobDate || '');
    setVendor(jobData.vendor || '');
    setApplicator(jobData.applicator || '');
    setJobStatus(jobData.status || 'Planned');
    setEditableProducts(jobData.products || []);
    setWaterVolume(jobData.waterVolume || '');
    setJobId(jobId);
    setNotes(jobData.notes || '');

    // ✅ Patch this in
    if (!fields.length && location.state?.selectedFields?.length) {
      setFields(location.state.selectedFields);
    }
  };

  loadJob();
}, [location.state]);


    useEffect(() => {
    const selected = location.state?.selectedFields || [];

    if (fields.length || !selected.length) return;

    const loadBoundaries = async () => {
      const enriched = await Promise.all(
        selected.map(async (f) => {
          const ref = doc(db, 'fields', f.fieldId || f.id);
          const snap = await getDoc(ref);
          if (!snap.exists()) return f;

          let geo = snap.data()?.boundary?.geojson;
          if (typeof geo === 'string') {
            try {
              geo = JSON.parse(geo);
            } catch {
              geo = null;
            }
          }

          return {
            ...f,
            boundary: { geojson: geo }
          };
        })
      );

      setFields(enriched);
    };

    loadBoundaries();
  }, []);

    const handleProductChange = (index, field, value) => {
    const updated = [...editableProducts];
    updated[index][field] = value;
    setEditableProducts(updated);
  };

  const handleAddProduct = () => {
    setEditableProducts(prev => [...prev, { productId: '', productName: '', rate: '', unit: '' }]);
  };
// 🔹 Patch polygon updates from Edit Area
useEffect(() => {
  const updated = location.state?.updatedField;

  if (updated?.id || updated?.fieldId) {
setFields(prev =>
  prev.map(f =>
    (f.id === updated.id || f.fieldId === updated.fieldId)
      ? {
          ...f,
          drawnPolygon: updated.drawnPolygon,
          drawnAcres: updated.drawnAcres,
          acres: updated.drawnAcres ?? f.acres,
          boundary: f.boundary,          // ✅ keep existing boundary
          jobId: updated.jobId || f.jobId,
          fieldId: updated.fieldId || f.fieldId || f.id
        }
      : f
  )
);

  }
}, [location.state]);


  // 🔹 Early Exit if No Job Types
if (!jobTypesList.length) return null;

// 🔹 Begin Page Layout
return (
  <div className="p-6">

    {/* 🔹 Job Type Selector */}
    <div className="mb-4">
      <label className="block text-sm font-medium">Job Type</label>
      {jobTypesList.length > 0 && (
       <select
  value={jobType?.name || ''}
  onChange={e => {
    if (isEditing) return; // 🚫 Prevent changing job type while editing
    const selected = jobTypesList.find(t => t.name === e.target.value);
    setJobType(selected || '');
  }}
  disabled={isEditing}
  className={`border border-gray-300 rounded-md px-3 py-2 bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
>

          <option value="">Select Job Type</option>
          {jobTypesList.map(type => (
            <option key={type.name} value={type.name}>
              {type.name} {type.parentName ? `(${type.parentName})` : ''}
            </option>
          ))}
        </select>
      )}
    </div>

    {/* 🔹 Date, Vendor, Applicator, Status */}
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label className="block text-sm font-medium">Job Date</label>
        <input
          type="date"
          value={jobDate}
          onChange={e => setJobDate(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Vendor</label>
        <select
          value={vendor}
          onChange={e => setVendor(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Vendor</option>
          {vendors.map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">Applicator</label>
        <select
          value={applicator}
          onChange={e => setApplicator(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Applicator</option>
          {applicators.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">Job Status</label>
        <select
          value={jobStatus}
          onChange={e => setJobStatus(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Planned">Planned</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
    </div>

    {/* 🔹 Products Section */}
    {requiresProducts && editableProducts.map((p, i) => (
      <div key={i} className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3 items-center">
        <ProductComboBox
          productType={selectedProductType}
          allProducts={productsList.filter(p => {
            const parent = jobType?.parentName;
            if (parent === 'Seeding') return p.type === 'Seed';
            if (parent === 'Spraying') return p.type === 'Chemical';
            if (parent === 'Fertilizer') return p.type === 'Fertilizer';
            return true;
          })}
          usedProductIds={[]}
          value={{ id: p.productId, name: p.productName }}
          onChange={(selected) => {
            handleProductChange(i, 'productId', selected.id);
            handleProductChange(i, 'productName', selected.name);
            handleProductChange(i, 'crop', selected.crop || '');
            const rateType = selected?.rateType?.toLowerCase();
            const cleanUnit =
              rateType === 'weight'
                ? 'lbs/acre'
                : rateType === 'population'
                ? 'seeds/acre'
                : selected.unit || '';
            handleProductChange(i, 'unit', cleanUnit);
            handleProductChange(i, 'rateType', selected.rateType || '');
          }}
        />
        <input
          type="number"
          placeholder="Rate"
          className="border border-gray-300 rounded-md px-3 py-2 bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={p.rate}
          onChange={e => handleProductChange(i, 'rate', e.target.value)}
        />
        <select
          className="border p-2 rounded w-full"
          value={p.unit}
          onChange={e => handleProductChange(i, 'unit', e.target.value)}
        >
          <option value="">Select Unit</option>
          {[
            'fl oz/acre', 'pt/acre', 'qt/acre', 'gal/acre',
            'lbs/acre', 'oz dry/acre', 'tons/acre',
            'seeds/acre', 'units/acre', '%v/v'
          ].map(unit => (
            <option key={unit} value={unit}>{unit}</option>
          ))}
        </select>
        <button
          className={redLinkBtn}
          onClick={() => setEditableProducts(prev => prev.filter((_, idx) => idx !== i))}
        >
          🗑️ Remove
        </button>
      </div>
    ))}

    {requiresProducts && (
      <button
        onClick={handleAddProduct}
        className="text-sm bg-blue-600 text-white px-3 py-1 rounded shadow hover:bg-blue-700 transition mb-4"
      >
        + Add Product
      </button>
    )}

    {/* 🔹 Number of Passes (Tillage Only) */}
    {jobType?.parentName === 'Tillage' && (
      <div className="mb-4">
        <label className="block text-sm font-medium">Number of Passes</label>
        <input
          type="number"
          min={1}
          value={passes}
          onChange={e => setPasses(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 w-32 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    )}

    {/* 🔹 Water Volume (Spraying Only) */}
    {jobType?.parentName === 'Spraying' && (
      <div className="mb-4">
        <label className="block text-sm font-medium">Water Volume (gal/acre)</label>
        <input
          type="number"
          className="border rounded p-2 w-48"
          value={waterVolume}
          onChange={e => setWaterVolume(e.target.value)}
        />
      </div>
    )}

    {/* 🔹 Fields List Section */}
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-2">
        {totalJobAcres.toFixed(2)} acres total
      </h3>

{selectedFields.map((field) => {
        const isPartial = field.drawnPolygon && field.drawnAcres;
        const displayAcres = field.acres ?? (isPartial ? field.drawnAcres : field.gpsAcres) ?? 0;
        const crop = field.crop || field.crops?.[cropYear]?.crop || '—';

let parsedGeo = field.boundary?.geojson ?? field.boundary;
if (typeof parsedGeo === 'string') {
  try {
    parsedGeo = JSON.parse(parsedGeo);
  } catch {
    parsedGeo = null;
  }
}


        return (
          <div key={field.id} className="border border-gray-300 rounded-xl bg-white p-4 shadow-sm mb-6">
            <p>
              <strong>{field.fieldName}</strong> –{' '}
              {isLeveeJob
                ? `${((field.crop || field.crops?.[cropYear]?.crop || '').includes('Rice')
                    ? field.riceLeveeAcres
                    : field.beanLeveeAcres) || 0} acres (Levee – ${field.crop || field.crops?.[cropYear]?.crop || '—'})`
                : `${Number(displayAcres).toFixed(2)} acres – ${isPartial ? 'partial' : 'full'}`}
            </p>
            <p>Crop: {crop}</p>

            <div
              id={`field-canvas-${field.id}`}
              className="bg-white p-2 rounded border shadow-sm mt-4"
              style={{ width: 'fit-content', margin: '0 auto' }}
            >
              {(() => {
                let overlay = field.drawnPolygon;
                if (typeof overlay === 'string') {
                  try {
                    overlay = JSON.parse(overlay);
                  } catch {
                    overlay = null;
                  }
                }

                if (!parsedGeo) return null;

                const coords = parsedGeo.coordinates?.[0] || [];
                const bounds = coords.reduce((acc, [lng, lat]) => ({
                  minX: Math.min(acc.minX, lng),
                  maxX: Math.max(acc.maxX, lng),
                  minY: Math.min(acc.minY, lat),
                  maxY: Math.max(acc.maxY, lat),
                }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

                const width = bounds.maxX - bounds.minX || 1;
                const height = bounds.maxY - bounds.minY || 1;
                const boxSize = 300;
                const margin = 10;
                const scale = (boxSize - margin * 2) / Math.max(width, height);
                const xOffset = (boxSize - width * scale) / 2;
                const yOffset = (boxSize - height * scale) / 2;
                const project = ([lng, lat]) => ({
                  x: (lng - bounds.minX) * scale + xOffset,
                  y: boxSize - ((lat - bounds.minY) * scale + yOffset),
                });

                const basePath = coords.map((pt, i) => {
                  const { x, y } = project(pt);
                  return `${i === 0 ? 'M' : 'L'}${x},${y}`;
                }).join(' ') + ' Z';

                let overlayPath = null;
                if (overlay?.geometry?.coordinates?.[0]) {
                  overlayPath = overlay.geometry.coordinates[0].map((pt, i) => {
                    const { x, y } = project(pt);
                    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
                  }).join(' ') + ' Z';
                }

                return (
                  <svg viewBox={`0 0 ${boxSize} ${boxSize}`} className="w-64 h-64 bg-white border rounded shadow mx-auto">
                    <path d={basePath} fill={overlayPath ? '#F87171' : '#34D399'} fillOpacity={0.4} stroke="#4B5563" strokeWidth="1.5" />
                    {overlayPath && (
                      <path d={overlayPath} fill="#34D399" fillOpacity={0.6} stroke="#047857" strokeWidth="2" />
                    )}
                  </svg>
                );
              })()}
            </div>

            <div className="flex justify-between items-center mt-2 no-print">
            {!isEditing && (
<button
  className={blueLinkBtn}
  onClick={() => {
    setFieldToEdit(field);
    setShowEditAreaModal(true);
  }}
>
  ✏️ Edit Area
</button>


)}


              <button
                className={blueLinkBtn}
                onClick={() => setFields(prev => prev.filter(f => f.id !== field.id))}
              >
                ❌ Remove Field
              </button>
            </div>
          </div>
        );
      })}
    </div>

    {/* 🔹 Notes Section */}
    <div className="mt-6">
      <label className="block text-sm font-medium mb-1">Notes</label>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        className="w-full border border-gray-300 rounded-md p-2 text-sm resize-none"
        rows={4}
        placeholder="Add any notes for this job..."
      />
    </div>

    {/* 🔹 Product Totals */}
    {requiresProducts && (
      <div className="mt-6 border-t pt-4">
        <h4 className="font-semibold text-sm mb-2">Product Totals</h4>
        {editableProducts.map((p, i) => {
          const rate = parseFloat(p.rate);
          const unit = p.unit?.toLowerCase() || '';
          const crop = p.crop?.toLowerCase?.() || '';
         const acres = fields.reduce((sum, f) => {
  if (isLeveeJob) {
    const crop = f.crop || f.crops?.[cropYear]?.crop || '';
    if (crop.includes('Rice') && f.riceLeveeAcres) return sum + parseFloat(f.riceLeveeAcres);
    if (crop.includes('Soybean') && f.beanLeveeAcres) return sum + parseFloat(f.beanLeveeAcres);
  }
  return sum + (f.acres ?? f.drawnAcres ?? f.gpsAcres ?? 0);
}, 0);


          const totalAmount = rate * acres;
          let display = '';

          if (['seeds/acre', 'population'].includes(unit)) {
            const seedsPerUnit = crop.includes('rice') ? 900000 : crop.includes('soybean') ? 140000 : 1000000;
            const totalSeeds = rate * acres;
            const units = totalSeeds / seedsPerUnit;
            display = `${units.toFixed(1)} units (${seedsPerUnit.toLocaleString()} seeds/unit)`;
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
            const water = parseFloat(waterVolume || 0);
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

    {/* 🔹 Save Button */}
    <div className="flex justify-between items-center mt-6">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={shouldGeneratePDF}
          onChange={() => setShouldGeneratePDF(!shouldGeneratePDF)}
        />
        <span>Generate PDF after saving</span>
      </label>

      <button
        className={primaryBtn}
  onClick={() => {
const fieldsWithCrop = selectedFields.map(f => ({
    ...f,
    crop: f.crop || f.crops?.[cropYear]?.crop || ''
  }));

  console.log('🛑 FIELDS PASSED TO SAVEJOB:', fieldsWithCrop);

  saveJob({
    jobType,
    fields: fieldsWithCrop,
    editableProducts,
    vendor,
    applicator,
    cropYear,
    jobDate,
    jobStatus,
    jobId,
    notes,
    shouldGeneratePDF,
    waterVolume,
    isEditing,
    navigate,
    setSaving,
    passes
  });
}}

        disabled={saving}
      >
        {saving
          ? 'Saving...'
          : isEditing
            ? 'Update Job'
            : 'Save Final Job'}
      </button>
    </div>
<EditAreaModal
  isOpen={showEditAreaModal}
  onClose={() => setShowEditAreaModal(false)}
>
  {fieldToEdit && (
   <EditJobPolygonForCreate
  field={fieldToEdit}
  onCloseModal={() => setShowEditAreaModal(false)}
  onSavePolygon={handleSavePolygon}
/>

  )}
</EditAreaModal>

   </div> 
  ); // ✅ This closes the return
} // ✅ This closes the function


