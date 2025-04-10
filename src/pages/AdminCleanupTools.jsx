import React, { useState } from 'react';
import { getDocs, collection, doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminCleanupTools() {
  const [status, setStatus] = useState('');

  const removeCropYearFromFields = async () => {
    setStatus('Removing cropYear fields...');
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

  const scanForBadGeo = async () => {
    setStatus('Scanning for bad geojson...');
    try {
      const isBadGeo = (value) => {
        if (typeof value !== 'string') return false;
        if (value === 'WGS84') return true;
        if (value.length < 30) return true;
        return false;
      };

      const badFields = [];
      const fieldSnap = await getDocs(collection(db, 'fields'));
      fieldSnap.forEach(docSnap => {
        const data = docSnap.data();
        const geo = data?.boundary?.geojson;
        if (isBadGeo(geo)) {
          badFields.push({ id: docSnap.id, geo });
        }
      });

      const badJobs = [];
      const jobSnap = await getDocs(collection(db, 'jobs'));
      jobSnap.forEach(docSnap => {
        const data = docSnap.data();
        const geo = data?.geojson || data?.drawnPolygon || null;
        if (isBadGeo(geo)) {
          badJobs.push({ id: docSnap.id, geo });
        }
      });

      console.log('🟡 Bad Fields:', badFields);
      console.log('🟡 Bad Jobs:', badJobs);
      setStatus(`✅ Scan complete. Found ${badFields.length} bad fields and ${badJobs.length} bad jobs.`);
    } catch (err) {
      console.error('Error scanning geojson:', err);
      setStatus('❌ Error during geojson scan. See console for details.');
    }
  };

  return (
    <div className="p-6 max-w-xl space-y-4">
      <h2 className="text-xl font-bold">Admin Cleanup Tools</h2>

      <button
        onClick={removeCropYearFromFields}
        className="bg-red-600 text-white px-4 py-2 rounded shadow text-sm"
      >
        🧹 Remove cropYear from all fields
      </button>

      <button
        onClick={scanForBadGeo}
        className="bg-blue-600 text-white px-4 py-2 rounded shadow text-sm"
      >
        🔍 Scan for bad geojson in fields & jobs
      </button>

      {status && <p className="text-sm text-gray-700">{status}</p>}
    </div>
  );
}
