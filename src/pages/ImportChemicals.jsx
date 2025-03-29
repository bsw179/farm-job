import React, { useState } from 'react';
import Papa from 'papaparse';
import { collection, addDoc } from 'firebase/firestore';
import db from '../firebase';

export default function ImportChemicals() {
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
              name: row.productName,
              type: 'Chemical',
              unitLabel: row.unitLabel,
              unitAbbrev: row.unitAbbrev,
              rateType: row.rateType || 'per acre',
              carrierVolumeRequired: row.carrierVolumeRequired === 'true'
            });
            success++;
          } catch (err) {
            console.error('Import failed:', row, err);
            failed++;
          }
        }

        setMessage(`Imported ${success} chemicals. ${failed} failed.`);
      }
    });
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Import Chemicals</h2>
      <a
        href="/chemicals-template.csv"
        download
        className="inline-block mb-4 text-blue-600 hover:underline text-sm"
      >
        📥 Download blank chemicals-template.csv
      </a>
      <input type="file" accept=".csv" onChange={handleUpload} className="mb-4" />
      {message && <p className="text-green-700 font-semibold">{message}</p>}
      <p className="text-sm text-gray-600">
        Your CSV must include: <code>productName, unitLabel, unitAbbrev, rateType, carrierVolumeRequired</code>
      </p>
    </div>
  );
}
