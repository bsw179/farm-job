import React, { useState } from 'react';
import Papa from 'papaparse';
import { collection, addDoc } from 'firebase/firestore';
import db from '../firebase';

export default function ImportFertilizers() {
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
              type: 'Fertilizer',
              unitLabel: row.unitLabel,
              unitAbbrev: row.unitAbbrev,
              defaultRate: row.defaultRate ? parseFloat(row.defaultRate) : null,
              rateType: row.rateType || 'per acre'
            });
            success++;
          } catch (err) {
            console.error('Import failed:', row, err);
            failed++;
          }
        }

        setMessage(`Imported ${success} fertilizers. ${failed} failed.`);
      }
    });
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Import Fertilizers</h2>
      <a
        href="/fertilizers-template.csv"
        download
        className="inline-block mb-4 text-blue-600 hover:underline text-sm"
      >
        📥 Download blank fertilizers-template.csv
      </a>
      <input type="file" accept=".csv" onChange={handleUpload} className="mb-4" />
      {message && <p className="text-green-700 font-semibold">{message}</p>}
      <p className="text-sm text-gray-600">
        Your CSV must include: <code>productName, unitLabel, unitAbbrev, defaultRate, rateType</code>
      </p>
    </div>
  );
}
