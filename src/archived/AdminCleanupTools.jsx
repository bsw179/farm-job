// src/pages/AdminCleanupTools.jsx
import React, { useState } from 'react';
import { getDocs, collection, doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminCleanupTools() {
  const [status, setStatus] = useState('');

  const removeCropYearFromFields = async () => {
    setStatus('Running...');
    try {
      const snapshot = await getDocs(collection(db, 'fields'));
      const updates = snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        if ('cropYear' in data) {
          const ref = doc(db, 'fields', docSnap.id);
          await updateDoc(ref, {
            cropYear: deleteField()
          });
          console.log(`Removed cropYear from ${docSnap.id}`);
        }
      });
      await Promise.all(updates);
      setStatus('✅ Cleanup complete. All cropYear fields removed.');
    } catch (err) {
      console.error('Error cleaning up fields:', err);
      setStatus('❌ Error during cleanup. See console for details.');
    }
  };

  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-xl font-bold mb-4">Admin Cleanup Tools</h2>
      <button
        onClick={removeCropYearFromFields}
        className="bg-red-600 text-white px-4 py-2 rounded shadow text-sm"
      >
        🧹 Remove cropYear from all fields
      </button>
      {status && <p className="mt-4 text-sm text-gray-700">{status}</p>}
    </div>
  );
}
