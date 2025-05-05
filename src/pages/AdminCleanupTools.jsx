import React, { useEffect } from 'react';
import { getDocs, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminCleanupTools() {
  
const handleBackfillJobsByField = async () => {
  console.log('🔁 Starting jobsByField backfill...');

  const [fieldsSnap, productsSnap, jobsSnap] = await Promise.all([
    getDocs(collection(db, 'fields')),
    getDocs(collection(db, 'products')),
    getDocs(collection(db, 'jobsByField')),
  ]);

  const fieldMap = {};
  fieldsSnap.docs.forEach(doc => fieldMap[doc.id] = { id: doc.id, ...doc.data() });

  const productMap = {};
  productsSnap.docs.forEach(doc => productMap[doc.id] = { id: doc.id, ...doc.data() });

  let updatedCount = 0;

  for (const docSnap of jobsSnap.docs) {
    const job = { id: docSnap.id, ...docSnap.data() };

    const field = fieldMap[job.fieldId];
    if (!field) continue;

    const updatedProducts = (job.products || []).map(p => {
      const prod = productMap[p.productId] || {};
      return {
        ...p,
        type: p.type || prod.type || '',
        vendorName: p.vendorName || prod.vendorName || '',
        vendorId: p.vendorId || prod.vendorId || '',
        unitSize: p.unitSize || prod.unitSize || '',
        seedsPerUnit: p.seedsPerUnit || prod.seedsPerUnit || '',
        form: p.form || prod.form || '',
        npk: p.npk || prod.npk || '',
        ai: p.ai || prod.ai || ''
      };
    });

    const updated = {
      products: updatedProducts,
      farmName: job.farmName || field.farmName || '',
      farmNumber: job.farmNumber || field.farmNumber || '',
      tractNumber: job.tractNumber || field.tractNumber || '',
      fsaFieldNumber: job.fsaFieldNumber || field.fsaFieldNumber || '',  
      operatorRentShare: job.operatorRentShare ?? field.operatorRentShare ?? null,
      landownerRentShare: job.landownerRentShare ?? field.landownerRentShare ?? null,
      county: job.county || field.county || '',

    };

    await updateDoc(doc(db, 'jobsByField', job.id), updated);
    updatedCount++;
  }

  console.log(`✅ Backfill complete. Updated ${updatedCount} jobs.`);
};


  return (
  <div className="p-6">
    <h1 className="text-xl font-bold">Admin Cleanup Tools</h1>
    <p className="mb-4">Use these tools carefully — they patch job data in Firestore.</p>

    <div className="space-y-4 mt-6">
   
 <button
  onClick={handleBackfillJobsByField}
  className="bg-yellow-500 text-white px-4 py-2 rounded shadow hover:bg-yellow-600"
>
  🔄 Backfill jobsByField snapshot data
</button>



    </div>
  </div>
  );
}

