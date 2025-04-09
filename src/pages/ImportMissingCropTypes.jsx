import React, { useState } from 'react';
import { getDocs, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminRenameRice() {
  const [status, setStatus] = useState('');

  const renameCropAcrossFields = async () => {
    setStatus('Running...');
    const snapshot = await getDocs(collection(db, 'fields'));

    const promises = snapshot.docs.map(async (fieldDoc) => {
      const data = fieldDoc.data();
      const crops = data.crops || {};
      const crop2025 = crops['2025'];

      if (crop2025?.crop === 'Rice') {
        const updatedCrops = {
          ...crops,
          '2025': {
            ...crop2025,
            crop: 'Rice - Long Grain',
          },
        };

        await updateDoc(doc(db, 'fields', fieldDoc.id), {
          crops: updatedCrops,
        });

        console.log(`✅ Updated field ${fieldDoc.id}`);
      }
    });

    await Promise.all(promises);
    setStatus('✅ Done updating all fields.');
  };

  return (
    <div className="p-6">
      <h1 className="text-lg font-bold mb-2">Admin Rename Script</h1>
      <button onClick={renameCropAcrossFields} className="bg-blue-600 text-white px-4 py-2 rounded">
        Rename "Rice" to "Rice - Long Grain"
      </button>
      <p className="mt-4">{status}</p>
    </div>
  );
}
