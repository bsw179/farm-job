// 🔹 saveJob.js

import { doc, setDoc, getDoc, getDocs, deleteDoc, collection, serverTimestamp, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import html2canvas from 'html2canvas';


export async function saveJob({
  jobType,
  fields,
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
  passes,
  seedTreatments,
  seedTreatmentStatus,

}) {
  setSaving(true);
console.log('🧹 FIELDS ENTERING saveJob:', fields);

  const jobDocRef = jobId
  ? doc(db, 'jobs', jobId)
  : doc(collection(db, 'jobs'));


  const finalJobId = jobDocRef.id;

  try {
    if (!jobType) {
      alert('Please select a job type before saving.');
      setSaving(false);
      return;
    }

    if (fields.length === 0) {
      alert('Please add at least one field.');
      setSaving(false);
      return;
    }

    const requiresProducts = ['Seeding', 'Spraying', 'Fertilizing'].includes(jobType?.parentName);
    if (requiresProducts && editableProducts.length === 0) {
      alert('Please add at least one product.');
      setSaving(false);
      return;
    }

const incompleteProduct = editableProducts.find(p =>
  ['seed', 'fertilizer', 'chemical'].includes((p.type || '').toLowerCase()) &&
  (!p.productId || !p.rate || !p.unit)
);

    if (incompleteProduct) {
      alert('Please fill out all product fields (product, rate, and unit).');
      setSaving(false);
      return;
    }


    await new Promise(res => setTimeout(res, 100)); // slight delay for UI

    // Capture screenshots if needed (optional - you can disable if not needed)
    const updatedFields = await Promise.all(fields.map(async (field) => {
      const ref = document.getElementById(`field-canvas-${field.id}`);
      if (!ref) return field;

      const buttons = ref.querySelectorAll('.no-print');
      buttons.forEach(btn => btn.style.display = 'none');

      const canvas = await html2canvas(ref);
      const imageBase64 = canvas.toDataURL('image/png');

      buttons.forEach(btn => btn.style.display = '');

     return { 
  ...field,
  imageBase64,
  crop: field.crop || '',  // ✅ Carry it over no matter what
};
    }));

 const cleanedProducts = editableProducts.map(p => ({
  productId: p.productId || '',
  productName: p.productName || '',
  type: p.type || '',
  rate: p.rate || '',
  unit: p.unit || '',
  rateType: p.rateType || '',
  crop: p.crop || '',

  // Optional but useful for seed/chemical reports
  vendorId: p.vendorId || '',
  vendorName: p.vendorName || '',
  unitSize: p.unitSize || '',
  seedsPerUnit: p.seedsPerUnit || '',
  form: p.form || '',
  npk: p.npk || '',
  ai: p.ai || ''
}));


const isLeveeJob =
  jobType?.name?.toLowerCase().includes('levee') ||
  jobType?.name?.toLowerCase().includes('pack');

   const updatedFieldsWithAcres = updatedFields.map(f => {
  let polygon = f.drawnPolygon;
  if (polygon && typeof polygon === 'object' && polygon.type === 'Feature') {
    polygon = JSON.stringify(polygon);
  }

  return {
    ...f,
    boundary: f.boundary
      ? (typeof f.boundary === 'string'
        ? f.boundary
        : f.boundary.geojson
          ? (typeof f.boundary.geojson === 'string' ? f.boundary.geojson : JSON.stringify(f.boundary.geojson))
          : JSON.stringify(f.boundary))
      : null,
    drawnPolygon: polygon ?? null,
  acres: isLeveeJob
  ? (
      f.crop?.toLowerCase().includes('rice') && f.riceLeveeAcres != null
        ? Number(f.riceLeveeAcres)
        : f.crop?.toLowerCase().includes('soybean') && f.beanLeveeAcres != null
        ? Number(f.beanLeveeAcres)
        : 0
    )
  : f.drawnAcres ?? f.gpsAcres ?? f.acres ?? 0,


    riceLeveeAcres: f?.riceLeveeAcres ?? null,
    beanLeveeAcres: f?.beanLeveeAcres ?? null,
    crop: f?.crop || '',
    operator: f.operator || '',
    landowner: f.landowner || '',
operatorExpenseShare: typeof f.operatorExpenseShare === 'number' ? f.operatorExpenseShare : null,
landownerExpenseShare: typeof f.landownerExpenseShare === 'number' ? f.landownerExpenseShare : null,
operatorRentShare: typeof f.operatorRentShare === 'number' ? f.operatorRentShare : null,
landownerRentShare: typeof f.landownerRentShare === 'number' ? f.landownerRentShare : null,
county: f.county || '',

  };
});

console.log('🛑 FIELDS AFTER UPDATEDFIELDSWITHACRES BUILD:', updatedFieldsWithAcres);
console.log('🔍 Sample field before updatedFieldsWithAcres:', updatedFields[0]);

       // 🛠️ Save or update master grouped job
 const masterJob = {
  jobId: finalJobId,
  jobType: {
  name: jobType.name,
  parentName: jobType.parentName || '',
  icon: jobType.icon || '',
  cost: jobType.cost || 0,
  productType: jobType.productType || '',
  defaultUnit: jobType.defaultUnit || '',
  requiresWater: jobType.requiresWater ?? false
  },
  ...(jobType?.parentName === 'Tillage' ? { passes: parseInt(passes) || 1 } : {}),
  vendor: vendor || '',
  applicator: applicator || '',
  seedTreatmentStatus: seedTreatmentStatus || '', // ✅ <-- INSERT THIS LINE
  products: cleanedProducts,


  cropYear,
  jobDate,
  status: jobStatus,
  fields: updatedFieldsWithAcres
    .filter(f => !f.isDetachedFromGroup)
  .map(f => ({
  id: f.id,
  fieldId: f.fieldId || f.id,
  fieldName: f.fieldName || '',
  farmName: f.farmName || '',
  farmNumber: f.farmNumber || '',
  tractNumber: f.tractNumber || '',
  fsaFieldNumber: f.fsaFieldNumber || '',
  gpsAcres: f.gpsAcres ?? null,
  fsaAcres: f.fsaAcres ?? null,
  county: f.county || '',
  acres: f.acres ?? 0,
  drawnAcres: f.drawnAcres ?? null,
  crop: f.crop || '',
  riceLeveeAcres: f.riceLeveeAcres ?? null,
  beanLeveeAcres: f.beanLeveeAcres ?? null,
  boundary: f.boundary
    ? (typeof f.boundary === 'string' ? f.boundary : JSON.stringify(f.boundary))
    : null,
  drawnPolygon: f.drawnPolygon
    ? (typeof f.drawnPolygon === 'string' ? f.drawnPolygon : JSON.stringify(f.drawnPolygon))
    : null,
  operator: f.operator || '',
  landowner: f.landowner || '',
  operatorExpenseShare: typeof f.operatorExpenseShare === 'number' ? f.operatorExpenseShare : null,
  landownerExpenseShare: typeof f.landownerExpenseShare === 'number' ? f.landownerExpenseShare : null,
  expenseSplit: {
    operator: f.operator || '',
    operatorShare: typeof f.operatorExpenseShare === 'number' ? f.operatorExpenseShare : 100,
    landowner: f.landowner || '',
    landownerShare: typeof f.landownerExpenseShare === 'number' ? f.landownerExpenseShare : 0,
operatorRentShare: typeof f.operatorRentShare === 'number' ? f.operatorRentShare : null,
landownerRentShare: typeof f.landownerRentShare === 'number' ? f.landownerRentShare : null,
county: f.county || '',

  }
}))

,

fieldIds: updatedFieldsWithAcres
  .filter(f => !f.isDetachedFromGroup)
  .map(f => f.id),

      waterVolume: jobType?.parentName === 'Spraying' ? waterVolume : '',
      notes,
      timestamp: serverTimestamp()
    };
console.log('🧹 Final fields going into saveJob:', updatedFieldsWithAcres);
console.log('🧹 Field[0] crop:', updatedFieldsWithAcres[0]?.crop);
console.log('🛑 MASTERJOB FINAL STRUCTURE BEFORE SAVE:', masterJob);
console.log("🧪 masterJob before save:", JSON.stringify(masterJob, null, 2));

    await setDoc(jobDocRef, masterJob, { merge: true });

        // 🛠️ Save or update each field-level job (jobsByField)
    const jobsByFieldPromises = updatedFieldsWithAcres.map(async (field) => {
      // Skip detached fields
      if (field.isDetachedFromGroup) return;

      const fieldJobId = `${finalJobId}_${field.fieldId || field.id}`;
      const fieldJobRef = doc(db, 'jobsByField', fieldJobId);

      const jobEntry = {
        jobId: fieldJobId,
        linkedToJobId: finalJobId,
        fieldId: field.fieldId || field.id,
        fieldName: field.fieldName || '',
        farmName: field.farmName || '',
        farmNumber: field.farmNumber || '',
        tractNumber: field.tractNumber || '',
        fsaFieldNumber: field.fsaFieldNumber || '',
        gpsAcres: field.gpsAcres ?? null,
        fsaAcres: field.fsaAcres ?? null,
        county: field.county || '',

        cropYear,
        crop: field.crop || '',
        acres: field.acres ?? 0,
        drawnAcres: field.drawnAcres ?? null,
        drawnPolygon: field.drawnPolygon ? (typeof field.drawnPolygon === 'string' ? field.drawnPolygon : JSON.stringify(field.drawnPolygon)) : null,
        boundary: field.boundary ? (typeof field.boundary === 'string' ? field.boundary : JSON.stringify(field.boundary)) : null,
        status: jobStatus,
        vendor: vendor || '',
        applicator: applicator || '',
        products: cleanedProducts,


      jobType: {
        name: jobType.name,
        parentName: jobType.parentName || '',
        icon: jobType.icon || '',
        cost: jobType.cost || 0,
        productType: jobType.productType || '',
        defaultUnit: jobType.defaultUnit || '',
        requiresWater: jobType.requiresWater ?? false
        },
        jobDate: jobDate || '',
        notes: notes || '',
        waterVolume: jobType?.parentName === 'Spraying' ? waterVolume : '',
        ...(jobType?.parentName === 'Tillage' ? { passes: parseInt(passes) || 1 } : {}),
        operator: field.operator || '',
        expenseSplit: {
        operator: field.operator || '',
        operatorShare: typeof field.operatorExpenseShare === 'number' ? field.operatorExpenseShare : 100,
        landowner: field.landowner || '',
        landownerShare: typeof field.landownerExpenseShare === 'number' ? field.landownerExpenseShare : 0
        },

        seedTreatmentStatus: seedTreatmentStatus || '',
        landowner: field.landowner || '',
        operatorExpenseShare: typeof field.operatorExpenseShare === 'number' ? field.operatorExpenseShare : undefined,
        landownerExpenseShare: typeof field.landownerExpenseShare === 'number' ? field.landownerExpenseShare : undefined,

        timestamp: serverTimestamp()
      };

      const existing = await getDoc(fieldJobRef);

      if (existing.exists()) {
        const existingData = existing.data();
        if (existingData.isDetachedFromGroup) {
          // 🧹 If the existing field job is already detached, skip overwriting
          return;
        }
      }

      await setDoc(fieldJobRef, jobEntry, { merge: true });
    });

    await Promise.all(jobsByFieldPromises);

        // 📄 Handle PDF generation if requested
    if (shouldGeneratePDF) {
      try {
        const { generatePDFBlob } = await import('../utils/generatePDF');
        const blob = await generatePDFBlob({ ...masterJob, fields: updatedFieldsWithAcres });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `JobOrder_${jobType?.name || 'Unknown'}_${cropYear}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error('❌ PDF generation failed:', err);
        alert('Job saved, but PDF failed to generate.');
      }
    }

    // 🚜 All done — navigate back to Jobs page
    navigate('/jobs');

  } catch (err) {
    console.error('❌ Failed to save job:', err);
    alert('Failed to save job.');
  } finally {
    setSaving(false);
  }
}
