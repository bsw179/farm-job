import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import db from '../firebase';
import { Link } from 'react-router-dom';

export default function Fields({ cropYear }) {
  const [fields, setFields] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'fields'), (snapshot) => {
      const fieldData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFields(fieldData);
    });

    return () => unsubscribe();
  }, []);

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
                <Link to={`/fields/${field.id}`} className="text-blue-800 hover:underline">
                  <strong>{field.fieldName}</strong> – {field.farmName} – {field.county} – {field.gpsAcres} acres
                </Link>
              </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
