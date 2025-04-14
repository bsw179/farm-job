import React, { useEffect } from 'react';
import { getDocs, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminCleanupTools() {
  useEffect(() => {
    const checkBoundaries = async () => {
      const snapshot = await getDocs(collection(db, 'fields'));
      const allFields = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      for (const field of allFields) {
        const raw = field.boundary?.geojson;

        if (!raw) continue;

        try {
          const geo = typeof raw === 'string' ? JSON.parse(raw) : raw;
          const coords = geo?.geometry?.coordinates;

          if (!Array.isArray(coords) || coords.length === 0) {
            console.warn(`❌ Field "${field.fieldName}" (${field.id}) has invalid or empty coordinates.`);

            // OPTIONAL: Uncomment below to remove the broken geojson from the DB
            /*
            await updateDoc(doc(db, 'fields', field.id), {
              'boundary.geojson': null
            });
            console.log(`🚫 Removed boundary from ${field.fieldName}`);
            */
          }
        } catch (err) {
          console.error(`🛑 Failed to parse geojson for ${field.fieldName} (${field.id})`, err);
        }
      }

      console.log('✅ Boundary scan complete.');
    };

    checkBoundaries();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Admin Cleanup Tools</h1>
      <p>Check console for invalid boundaries...</p>
    </div>
  );
}
