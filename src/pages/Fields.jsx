import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import db from '../firebase';

export default function Fields({ cropYear }) {
  const [fields, setFields] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'fields'), (snapshot) => {
      const fieldData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFields(fieldData);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'fields', id));
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Fields – Crop Year: {cropYear}</h2>

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Saved Fields</h3>
        <ul className="space-y-2 text-sm">
          {fields
            .filter((field) => field.cropYear === cropYear)
            .map((field) => (
              <li key={field.id} className="p-3 bg-gray-100 rounded shadow-sm flex justify-between items-center">
                <span>
                  <strong>{field.fieldName}</strong> – {field.farmName} – {field.county} – {field.gpsAcres} acres
                </span>
                <button onClick={() => handleDelete(field.id)} className="text-red-600 hover:underline ml-4">🗑 Delete</button>
              </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
