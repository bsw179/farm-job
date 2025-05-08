// 🔹 Imports
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  setDoc,
} from 'firebase/firestore';
import { Trash2 } from 'lucide-react';

import { saveJob } from '../utils/saveJob'; // NEW!
import Select from 'react-select';
import ProductComboBox from '../components/ProductComboBox';
import EditAreaModal from "../components/EditAreaModal";
import EditJobPolygonForCreate from "../pages/EditJobPolygonForCreate";

async function updateProductUnit(productId, newUnit) {
  if (!productId) return;
  const ref = doc(db, 'products', productId);
  await updateDoc(ref, { unit: newUnit });
}

async function markProductAsUsed(productId, productName, type) {
  if (!productId) return;
  console.log(`🛠️ Marking product as used:`, { productId, productName, type }); // 👈 ADD THIS LINE

  const ref = doc(db, 'usedProducts', productId);
  const existing = await getDoc(ref);

  if (!existing.exists()) {
    await setDoc(ref, {
      productId,
      productName,
      type,
      timestamp: new Date()
    });
  }
}

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
const [editableProducts, setEditableProducts] = useState(
  (location.state?.products || []).filter(p => (p.type || '').toLowerCase() !== 'seed treatment')
);
const [seedTreatments, setSeedTreatments] = useState(
  (location.state?.products || []).filter(p => (p.type || '').toLowerCase() === 'seed treatment')
);
console.log("🧪 Initial editableProducts:", location.state?.products?.map(p => `${p.productName} (${p.type})`));

  const [productsList, setProductsList] = useState([]);
  const [jobTypesList, setJobTypesList] = useState([]);
  const [waterVolume, setWaterVolume] = useState('');
  const [isEditing, setIsEditing] = useState(location.state?.isEditing || false);
  const [jobId, setJobId] = useState(location.state?.jobId || doc(collection(db, 'jobs')).id);
  const [notes, setNotes] = useState(location.state?.notes || '');
  const [passes, setPasses] = useState(location.state?.passes || 1);
  const [showEditAreaModal, setShowEditAreaModal] = useState(false);
  const [fieldToEdit, setFieldToEdit] = useState(null);
const [usedProductIds, setUsedProductIds] = useState([]);
const [showFieldSelectModal, setShowFieldSelectModal] = useState(false);
const [allFields, setAllFields] = useState([]); // all available fields from DB
const [seedTreatmentStatus, setSeedTreatmentStatus] = useState('');
const [productVendors, setProductVendors] = useState(
  (location.state?.products || []).map(p => p.vendor || '')
);

console.log("🧪 Full initial product objects:", location.state?.products || []);
(location.state?.products || []).forEach(p =>
  console.log(`🧪 Product row →`, {
    name: p.productName,
    type: p.type,
    id: p.productId
  })
);



  const baseButton = "inline-flex items-center px-4 py-2 rounded shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1";
  const primaryBtn = `${baseButton} bg-green-600 text-white hover:bg-green-700`;
  const blueLinkBtn = "text-blue-600 hover:text-blue-800 underline text-sm";
  const redLinkBtn = "text-red-600 hover:text-red-800 underline text-sm";  
  const isLeveeJob = jobType?.name?.toLowerCase().includes('levee') || jobType?.name?.toLowerCase().includes('pack');

const totalJobAcres = fields.reduce((sum, f) => {
  const crop = f.crop || f.crops?.[cropYear]?.crop || '';
  const isRice = crop.toLowerCase().includes('rice');
  const isSoy = crop.toLowerCase().includes('soybean');

  if (isLeveeJob) {
    if (isRice && f.riceLeveeAcres != null) return sum + Number(f.riceLeveeAcres);
    if (isSoy && f.beanLeveeAcres != null) return sum + Number(f.beanLeveeAcres);
    return sum; // fallback for missing levee acres
  }

async function updateProductUnit(productId, newUnit) {
  if (!productId) return;
  const ref = doc(db, 'products', productId);
  await updateDoc(ref, { unit: newUnit });
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
  const fetchFields = async () => {
    const snap = await getDocs(collection(db, 'fields'));
    const fieldList = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setAllFields(fieldList);
  };

  fetchFields();
}, []);

 useEffect(() => {
  const fetchUsedProducts = async () => {
    const snap = await getDocs(collection(db, 'usedProducts'));
    const ids = snap.docs.map(doc => doc.data().productId); // ✅ pulls correct productId field
        console.log('🛠️ Used Product IDs loaded:', ids); // 👈 ADD THIS

setUsedProductIds(ids.filter(Boolean));
  };

  fetchUsedProducts();
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
const safeProducts = (jobData.products || []).map(p => {
  const type = (p.type || '').toLowerCase();
  if (!type && p.linkedToProductId) return { ...p, type: 'Seed Treatment' };
  return p;
});

const seedTreatmentsFromJob = safeProducts.filter(
  p => (p.type || '').toLowerCase() === 'seed treatment'
);

const editableProductsFromJob = safeProducts.filter(
  p => (p.type || '').toLowerCase() !== 'seed treatment'
);

setSeedTreatments(seedTreatmentsFromJob);
setEditableProducts(editableProductsFromJob);
setProductVendors(editableProductsFromJob.map(p => p.vendorName || p.vendor || ''));

console.log('🧠 jobData.seedTreatmentStatus →', jobData.seedTreatmentStatus);
setSeedTreatmentStatus(jobData.seedTreatmentStatus || '');



    setWaterVolume(jobData.waterVolume || '');
    setJobId(jobId);
    setNotes(jobData.notes || '');

    // ✅ Patch this in
  if (!fields.length && location.state?.selectedFields?.length) {
  const enriched = await enrichFieldData(location.state.selectedFields);
  setFields(enriched);
  setSelectedFields(enriched);
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

const fieldData = snap.data();
let geo = fieldData?.boundary?.geojson;

if (typeof geo === 'string') {
  try {
    geo = JSON.parse(geo);
  } catch {
    geo = null;
  }
}

return {
  ...f,
  boundary: { geojson: geo },
  operator: fieldData.operator || '',
  landowner: fieldData.landowner || '',
  operatorExpenseShare: typeof fieldData.operatorExpenseShare === 'number' ? fieldData.operatorExpenseShare : undefined,
  landownerExpenseShare: typeof fieldData.landownerExpenseShare === 'number' ? fieldData.landownerExpenseShare : undefined,
};


        })
      );

      setFields(enriched);
setSelectedFields(enriched); // ✅ sync them

    };

    loadBoundaries();
  }, []);

    const handleProductChange = (index, field, value) => {
    const updated = [...editableProducts];
    updated[index][field] = value;
    setEditableProducts(updated);
  };
const enrichFieldData = async (fieldArray) => {
  const enriched = await Promise.all(
    fieldArray.map(async (f) => {
      const ref = doc(db, 'fields', f.fieldId || f.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return f;

      const fieldData = snap.data();
      let geo = fieldData?.boundary?.geojson;

      if (typeof geo === 'string') {
        try {
          geo = JSON.parse(geo);
        } catch {
          geo = null;
        }
      }
      console.log('🧪 ENRICH:', {
  fieldId: f.id,
  operator: fieldData.operator,
  opShare: fieldData.operatorExpenseShare,
  loShare: fieldData.landownerExpenseShare
});

      return {
        ...f,
        boundary: { geojson: geo },
        operator: fieldData.operator || '',
        landowner: fieldData.landowner || '',
        operatorExpenseShare: typeof fieldData.operatorExpenseShare === 'number' ? fieldData.operatorExpenseShare : undefined,
        landownerExpenseShare: typeof fieldData.landownerExpenseShare === 'number' ? fieldData.landownerExpenseShare : undefined,
        riceLeveeAcres: fieldData.riceLeveeAcres ?? null,
        beanLeveeAcres: fieldData.beanLeveeAcres ?? null,
        crops: fieldData.crops ?? {},
      };
    })
  );

  return enriched;
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


 



async function handleSaveJob() {
const fieldsWithCrop = selectedFields.map(f => ({
  
  ...f,
  crop: f.crop || f.crops?.[cropYear]?.crop || '',
  operator: f.operator || '',
  landowner: f.landowner || '',
  operatorExpenseShare: typeof f.operatorExpenseShare === 'number' ? f.operatorExpenseShare : null,
  landownerExpenseShare: typeof f.landownerExpenseShare === 'number' ? f.landownerExpenseShare : null,
}));

const totalAcres = selectedFields.reduce((sum, f) => {
  const crop = f.crop || f.crops?.[cropYear]?.crop || '';
  if (isLeveeJob) {
    if (crop.includes('Rice') && f.riceLeveeAcres) return sum + parseFloat(f.riceLeveeAcres);
    if (crop.includes('Soybean') && f.beanLeveeAcres) return sum + parseFloat(f.beanLeveeAcres);
  }
  return sum + (f.acres ?? f.drawnAcres ?? f.gpsAcres ?? 0);
}, 0);

const linkedSeed = editableProducts.find(p => (p.type || '').toLowerCase() === 'seed');

// 🔁 Attach vendor name to each product
editableProducts.forEach((prod, i) => {
  prod.vendor = productVendors[i] || '';
});

const allProducts = [
  ...editableProducts,
  ...(seedTreatmentStatus === 'separate' ? seedTreatments : [])
];




  // 🔵 Mark all products used
  for (const product of editableProducts) {
    console.log('🔎 Marking product:', {
      id: product.productId,
      name: product.productName,
      type: product.type,
    }); // 👈 ADD THIS

    if (product.productId) {
      await markProductAsUsed(product.productId, product.productName, product.type || '');
    }
  }
console.log('🧠 Saving jobId:', jobId);

  console.log('🛑 FIELDS PASSED TO SAVEJOB:', fieldsWithCrop);
console.log('🧠 Final job data going to saveJob:');
console.log({
  jobType,
  fields: fieldsWithCrop,
  editableProducts: allProducts,
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
  passes
});


  // 🔵 Save the job
  console.log('🧪 FINAL PRODUCTS SENT TO SAVE:', JSON.stringify(allProducts, null, 2));

  saveJob({
  jobType,
  fields: fieldsWithCrop,
  editableProducts: allProducts,
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
  passes,
  seedTreatmentStatus,
  seedTreatments   // ✅ Add this line
});

}
  // 🔹 Early Exit if No Job Types
if (!jobTypesList.length) return null;


// 🔹 Begin Page Layout
return (
  <div className="p-6">
<button
  onClick={() => setShowFieldSelectModal(true)}
  className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition mb-4"
>
  ➕ Add Fields
</button>

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
  <label className="block text-sm font-medium mb-1">Vendor</label>
  <div className="flex items-center gap-2">
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

    <button
      type="button"
      onClick={() => setProductVendors(editableProducts.map(() => vendor))}
      className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition"
    >
      Apply to All
    </button>
  </div>
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
   {requiresProducts && editableProducts
  .filter(p => (p.type || '').toLowerCase() !== 'seed treatment')
  .map((p, i) => {

  console.log("🧪 Product row", {
    product: p.productName,
    productId: p.productId,
    usedIds: usedProductIds,
    matching: usedProductIds.includes(p.productId)
  });

  return (
   <div key={i} className="grid grid-cols-1 sm:grid-cols-5 gap-2 mb-2 items-start">

    {/* Product selector */}
    <ProductComboBox
      productType={selectedProductType}
      allProducts={productsList
        .filter(prod => {
          const parent = jobType?.parentName;
          if (parent === 'Seeding') return prod.type === 'Seed';
          if (parent === 'Spraying') return prod.type === 'Chemical';
          if (parent === 'Fertilizing') return prod.type === 'Fertilizer';
          return true;
        })
        .sort((a, b) => {
          const aUsed = usedProductIds.includes(a.id);
          const bUsed = usedProductIds.includes(b.id);
          if (aUsed && !bUsed) return -1;
          if (!aUsed && bUsed) return 1;
          return (a.name || '').localeCompare(b.name || '');
        })}
      usedProductIds={usedProductIds}
      value={{ id: p.productId, name: p.productName }}
      onChange={(selected) => {
        handleProductChange(i, 'productId', selected.id);
        handleProductChange(i, 'productName', selected.name);
        handleProductChange(i, 'crop', selected.crop || '');
        handleProductChange(i, 'unit', selected.unit || '');
        handleProductChange(i, 'rateType', selected.rateType || '');
        handleProductChange(i, 'type', selected.type || '');
      }}
    />

    {/* Rate input */}
    <input
      type="number"
      placeholder="Rate"
      className="border border-gray-300 rounded-md px-3 py-2 bg-white w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={p.rate}
      onChange={e => handleProductChange(i, 'rate', e.target.value)}
    />

    {/* Unit selector */}
    <select
      className="border p-2 rounded w-full"
      value={p.unit}
      onChange={async (e) => {
        const newUnit = e.target.value;
        const oldUnit = p.unit;

        handleProductChange(i, 'unit', newUnit);

        if (newUnit !== oldUnit) {
          const confirmUpdate = window.confirm("Update Product's Unit in Database?");
          if (confirmUpdate) {
            try {
              await updateProductUnit(p.productId, newUnit);
              alert("Product unit updated successfully.");
            } catch (error) {
              alert("Failed to update product unit.");
            }
          }
        }
      }}
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

    {/* Vendor + Remove column */}
    <div className="flex flex-col gap-1 w-full sm:w-[180px]">
      <select
        className="border p-2 rounded w-full text-red-600"
        value={productVendors[i] || ''}
        onChange={e => {
          const updated = [...productVendors];
          updated[i] = e.target.value;
          setProductVendors(updated);
        }}
      >
        <option value="">Select Vendor</option>
        {vendors.map(v => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => {
          setEditableProducts(prev => prev.filter((_, idx) => idx !== i));
          setProductVendors(prev => prev.filter((_, idx) => idx !== i));
        }}
        className="text-xs px-3 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded shadow-sm"
      >
        🗑 Remove Product
      </button>
    </div>
  </div>
);

})}


    {requiresProducts && (
      <button
        onClick={handleAddProduct}
        className="text-sm bg-blue-600 text-white px-3 py-1 rounded shadow hover:bg-blue-700 transition mb-4"
      >
        + Add Product
      </button>
    )}
{editableProducts.some(p => (p.type || '').toLowerCase() === 'seed') && (
  <div className="mt-6 border-t pt-4">
    <h4 className="font-semibold text-sm mb-2">Seed Treatment</h4>

    <div className="space-y-2 text-sm">
      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="seedTreatmentStatus"
          value="none"
          checked={seedTreatmentStatus === 'none'}
          onChange={(e) => setSeedTreatmentStatus(e.target.value)}
        />
        No seed treatment applied
      </label>

      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="seedTreatmentStatus"
          value="included"
          checked={seedTreatmentStatus === 'included'}
          onChange={(e) => setSeedTreatmentStatus(e.target.value)}
        />
        Treatment already included with seed
      </label>

      <label className="flex items-center gap-2">
        <input
          type="radio"
          name="seedTreatmentStatus"
          value="separate"
          checked={seedTreatmentStatus === 'separate'}
          onChange={(e) => setSeedTreatmentStatus(e.target.value)}
        />
        Treatment applied and tracked separately
      </label>
    </div>

    {seedTreatmentStatus === 'separate' && (
      <div className="mt-4 space-y-2">
       {seedTreatments.map((t, i) => (
  <div key={i} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
    <ProductComboBox
      productType="Seed Treatment"
      allProducts={productsList.filter(p => p.type === 'Seed Treatment')}
      usedProductIds={usedProductIds}
      value={{ id: t.productId, name: t.productName }}
      onChange={(selected) => {
        const updated = [...seedTreatments];
        updated[i] = {
          ...updated[i],
          productId: selected.id,
          productName: selected.name,
          type: 'Seed Treatment'
        };
        setSeedTreatments(updated);
      }}
    />

    <input
      type="number"
      placeholder="Rate"
      className="border border-gray-300 rounded-md px-2 py-1 w-full"
      value={t.rate || ''}
      onChange={e => {
        const updated = [...seedTreatments];
        updated[i].rate = e.target.value;
        setSeedTreatments(updated);
      }}
    />

    <select
      className="border border-gray-300 rounded-md px-2 py-1 w-full"
      value={t.unit || ''}
      onChange={e => {
        const updated = [...seedTreatments];
        updated[i].unit = e.target.value;
        setSeedTreatments(updated);
      }}
    >
      <option value="">Select Unit</option>
     <option value="/acre">/acre</option>

    </select>

    <div className="text-gray-500 text-xs italic">
      Tracked during purchase
    </div>

    <button
      className={redLinkBtn}
      onClick={() =>
        setSeedTreatments(prev => prev.filter((_, idx) => idx !== i))
      }
    >
      🗑️ Remove
    </button>
  </div>
))}


        <button
          onClick={() => setSeedTreatments(prev => [...prev, { productId: '', productName: '', rate: '', unit: '' }])}
          className="text-sm bg-blue-600 text-white px-3 py-1 rounded shadow hover:bg-blue-700 transition"
        >
          + Add Seed Treatment
        </button>
      </div>
    )}
  </div>
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
  <h3 className="text-sm font-semibold mb-2">
  Total Job Acres – {totalJobAcres.toFixed(2)}{isLeveeJob ? ' levee acres' : ''} ({selectedFields.length} fields selected)
</h3>



{selectedFields.map((field) => {
        const boxSize = 100;
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
<div key={field.id} className="relative border border-gray-300 rounded-xl bg-white px-4 py-2
shadow-sm mb-6">
    <button
  title="Remove Field"
  onClick={() => setSelectedFields(prev => prev.filter(f => f.id !== field.id))
}
className="absolute -top-0 left-1 text-red-400 hover:text-red-600"
>
  <Trash2 size={16} strokeWidth={2} />
</button>


<div className="flex items-start gap-4 mb-0">
  
  {/* 🔹 Left: Text */}
<div className="flex-1 space-y-1 text-xs text-gray-700 pt-3">
    <p className="font-semibold">
      {field.fieldName} –{' '}
      {isLeveeJob
        ? `${((field.crop || field.crops?.[cropYear]?.crop || '').includes('Rice')
            ? field.riceLeveeAcres
            : field.beanLeveeAcres) || 0} acres (Levee – ${field.crop || field.crops?.[cropYear]?.crop || '—'})`
        : `${Number(displayAcres).toFixed(2)} acres – ${isPartial ? 'partial' : 'full'}`}
    </p>
    <p>Crop: {crop}</p>
    <p className="text-gray-500">
      {(() => {
        const op = field.operator;
        const lo = field.landowner;
        const opShare = typeof field.operatorExpenseShare === 'number' ? field.operatorExpenseShare : null;
        const loShare = typeof field.landownerExpenseShare === 'number' ? field.landownerExpenseShare : null;

        let split = '';
        if (op && opShare !== null && opShare > 0) split += `${op}: ${opShare}%`;
        if (lo && loShare !== null && loShare > 0) split += `${split ? ' / ' : ''}${lo}: ${loShare}%`;
        return split;
      })()}
    </p>
  </div>

  {/* 🔹 Right: Map Preview */}
  <div
    id={`field-canvas-${field.id}`}
    className="p-1 border border-gray-300 rounded"
    style={{ width: 'fit-content' }}
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
    <svg viewBox={`0 0 ${boxSize} ${boxSize}`} className="w-24 h-24 border rounded">
      <path d={basePath} fill={overlayPath ? '#F87171' : '#34D399'} fillOpacity={0.4} stroke="#4B5563" strokeWidth="1.5" />
      {overlayPath && (
        <path d={overlayPath} fill="#34D399" fillOpacity={0.6} stroke="#047857" strokeWidth="2" />
      )}
    </svg>
  );
})()}

  </div>
</div>

{/* 🔹 Bottom: Edit / Remove */}
<div className="mt-0 pt-0 text-sm">
  {!isEditing && (
    <button
      onClick={() => {
        setFieldToEdit(field);
        setShowEditAreaModal(true);
      }}
      className="text-blue-600 hover:text-blue-800 underline"
    >
      ✏️ Edit Area
    </button>
  )}


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
    <h4 className="font-semibold text-sm mb-2">Seed + Product Summary</h4>

{editableProducts
  .filter(p => (p.type || '').toLowerCase() !== 'seed treatment')
  .map((p, i) => {
  const rate = parseFloat(p.rate);
  const unit = p.unit?.toLowerCase() || '';
  const crop = p.crop?.toLowerCase?.() || '';

  const acres = fields.reduce((sum, f) => {
    const crop = f.crop || f.crops?.[cropYear]?.crop || '';
    if (isLeveeJob) {
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

  } else if (unit === 'lbs/acre') {
    if (p.type === 'Seed') {
      const lbsPerBushel = crop.includes('rice') ? 45 : crop.includes('soybean') ? 60 : 50;
      const bushels = totalAmount / lbsPerBushel;
      display = `${bushels.toFixed(1)} bushels`;
    } else {
      const tons = totalAmount / 2000;
      display = `${totalAmount.toFixed(1)} lbs (${tons.toFixed(2)} tons)`;
    }

  } else if (unit === 'fl oz/acre') {
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
    const water = parseFloat(waterVolume);
    if (isNaN(water) || water === 0) {
      display = 'Missing water volume';
    } else {
      const gal = (rate / 100) * water * acres;
      display = `${gal.toFixed(2)} gallons`;
    }

  } else if (unit === 'tons/acre') {
    display = `${totalAmount.toFixed(2)} tons`;

  } else {
    display = `${totalAmount.toFixed(1)} ${unit.replace('/acre', '').trim()}`;
  }
{seedTreatmentStatus === 'separate' && seedTreatments.length > 0 && (
  <div className="mt-4">
    <h4 className="font-semibold text-sm mb-2">Tracked Seed Treatments</h4>
    {seedTreatments.map((p, i) => (
      <div key={i} className="text-sm text-gray-700 italic">
        {p.productName || p.name || 'Unnamed'} — tracked separately
      </div>
    ))}
  </div>
)}


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
onClick={handleSaveJob}


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


{/* 🔹 New Field Select Modal */}
{showFieldSelectModal && (
  <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
{/* 🔹 Sticky top bar */}
<div className="sticky top-0 bg-white z-20 border-b pb-2 mb-4">
  <div className="flex justify-between items-center mb-2">
    <p className="text-sm font-semibold">Fields Selected – {selectedFields.length}</p>
    <button
      onClick={async () => {
        const enriched = await enrichFieldData(selectedFields);
        setFields(enriched);
        setShowFieldSelectModal(false);
      }}
      className="text-sm bg-green-600 text-white px-3 py-1 rounded shadow hover:bg-green-700 transition"
    >
      ✅ Go Back to Job
    </button>
  </div>

  {/* 🔹 Selected Field Chips */}
  <div className="flex flex-wrap gap-2">
    {selectedFields.map(f => (
      <span
        key={f.id}
        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2 hover:bg-blue-200 transition"
      >
        {f.fieldName}
        <button
          onClick={() => setSelectedFields(prev => prev.filter(p => p.id !== f.id))}
          className="text-red-500 hover:text-red-700 font-bold"
        >
          ×
        </button>
      </span>
    ))}
  </div>
</div>

{/* 🔹 Field Groups by Farm (Accordion-style) */}
<div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
  {Object.entries(
    allFields
      .sort((a, b) => a.fieldName.localeCompare(b.fieldName))
      .reduce((acc, field) => {
        const farm = field.farmName || 'Other';
        if (!acc[farm]) acc[farm] = [];
        acc[farm].push(field);
        return acc;
      }, {})
  )
    .sort((a, b) => a[0].localeCompare(b[0])) // Sort farms alphabetically
    .map(([farmName, fields]) => (
      <details key={farmName} className="bg-gray-50 border rounded-md">
        <summary className="cursor-pointer px-3 py-1.5 font-medium text-xs bg-gray-100 border-b sticky top-0 z-10">

          {farmName} ({fields.length})
        </summary>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3">
          {fields
            .filter(f => !selectedFields.some(sel => sel.id === f.id))
            .sort((a, b) => a.fieldName.localeCompare(b.fieldName))
            .map(field => (
            <div
              key={field.id}
               onClick={() => setSelectedFields(prev => [...prev, field])}
                className="border rounded px-2 py-1.5 hover:bg-blue-50 cursor-pointer text-xs"
                >
              <p className="font-medium">{field.fieldName}</p>
            </div>


            ))}
        </div>
      </details>
    ))}
</div>
    </div>
  </div>
)}

   </div> 
  ); // ✅ This closes the return
} // ✅ This closes the function



