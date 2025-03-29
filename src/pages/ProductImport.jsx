import React, { useState } from 'react';
import Papa from 'papaparse';
import { collection, addDoc } from 'firebase/firestore';
import db from '../firebase';

export default function ProductImport() {
  const [message, setMessage] = useState('');

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        let success = 0;
        let failed = 0;

        for (const row of data) {
          try {
            await addDoc(collection(db, 'products'), {
              name: row.name || '',
              type: row.type || '', // e.g., seed, chemical, fertilizer
              unit: row.unit || '', // lb, gal, fl oz, etc.
              crop: row.crop || '', // optional
              tech: row.tech || '', // for seed tech (e.g. Clearfield)
              rateMode: row.rateMode || '' // per acre, % by volume, etc.
            });
            success++;
          } catch (err) {
            console.error('Import failed for:', row, err);
            failed++;
          }
        }

        setMessage(`Imported ${success} products. ${failed} failed.`);
      }
    });
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Import Products from CSV</h2>
      <input type="file" accept=".csv" onChange={handleUpload} className="mb-4" />
      {message && <p className="text-green-700 font-semibold">{message}</p>}
      <p className="text-sm text-gray-600">Your CSV should include columns: <code>name, type, unit, crop, tech, rateMode</code></p>
    </div>
  );
}
