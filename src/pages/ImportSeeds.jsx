import React, { useState } from 'react';
import Papa from 'papaparse';
import { collection, addDoc } from 'firebase/firestore';
import db from '../firebase';

export default function ImportSeeds() {
  const [message, setMessage] = useState('');

  const handleUpload = async (e) => {
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
              name: row.productName || '',
              type: 'Seed',
              crop: row.crop || '',
              unitType: row.unitType || 'weight',
              unitLabel: row.unitLabel || '',
              unitAbbrev: row.unitAbbrev || '',
              seedsPerUnit: row.seedsPerUnit ? parseFloat(row.seedsPerUnit) : null,
              lbsPerBushel: row.lbsPerBushel ? parseFloat(row.lbsPerBushel) : null,
              tech: row.technology || '',
              rateMode: row.unitType === 'population' ? 'population' : 'weight'
            });
            success++;
          } catch (err) {
            console.error('Import failed:', row, err);
            failed++;
          }
        }

        setMessage(`Imported ${success} seeds. ${failed} failed.`);
      }
    });
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Import Seed Products</h2>
      <a
        href="/seeds-template.csv"
        download
        className="inline-block mb-4 text-blue-600 hover:underline text-sm"
      >
        📥 Download blank seeds-template.csv
      </a>
      <input type="file" accept=".csv" onChange={handleUpload} className="mb-4" />
      {message && <p className="text-green-700 font-semibold">{message}</p>}
      <p className="text-sm text-gray-600">
        Your CSV must include: <code>productName, crop, unitType, unitLabel, unitAbbrev, seedsPerUnit, lbsPerBushel, technology</code>
      </p>
    </div>
  );
}
