import React, { useState } from 'react';
import Papa from 'papaparse';
import { collection, addDoc } from 'firebase/firestore';
import db from '../firebase';

export default function ImportRiceSeeds() {
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
              crop: 'Rice',
              unitType: row.unitType || '',
              unitLabel: row.unitLabel || '',
              unitAbbrev: row.unitAbbrev || '',
              seedsPerUnit: row.seedsPerUnit ? parseFloat(row.seedsPerUnit) : null,
              lbsPerBushel: row.lbsPerBushel ? parseFloat(row.lbsPerBushel) : null,
              tech: row.technology || '',
              manufacturer: row.manufacturer || '',
              rateMode: row.unitType === 'population' ? 'population' : 'weight'
            });
            success++;
          } catch (err) {
            console.error('Import failed:', row, err);
            failed++;
          }
        }

        setMessage(`Imported ${success} rice varieties. ${failed} failed.`);
      }
    });
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Import Rice Seed Varieties</h2>
      <a
        href="/rice-seeds-template.csv"
        download
        className="inline-block mb-4 text-blue-600 hover:underline text-sm"
      >
        📥 Download blank rice-seeds-template.csv
      </a>
      <input type="file" accept=".csv" onChange={handleUpload} className="mb-4" />
      {message && <p className="text-green-700 font-semibold">{message}</p>}
      <p className="text-sm text-gray-600">
        This uploader is built for rice varieties only. Format must match your updated CSV.
      </p>
    </div>
  );
}
