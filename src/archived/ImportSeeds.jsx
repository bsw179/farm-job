// src/pages/ImportSeeds.jsx
import React, { useState } from 'react';
import Papa from 'papaparse';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function ImportSeeds() {
  const [status, setStatus] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const promises = results.data.map((row) =>
            addDoc(collection(db, 'products'), row)
          );
          await Promise.all(promises);
          setStatus('✅ Seeds imported successfully!');
        } catch (err) {
          console.error('Import error:', err);
          setStatus('❌ Failed to import seeds.');
        }
      }
    });
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded shadow text-sm">
      <h2 className="text-xl font-bold mb-4">Import Seed Products</h2>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="mb-4"
      />
      {status && <div className="text-sm mt-2 font-medium">{status}</div>}
    </div>
  );
}
