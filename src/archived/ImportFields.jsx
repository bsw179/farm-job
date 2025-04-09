// src/pages/ImportFields.jsx
import React, { useState } from 'react';
import Papa from 'papaparse';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function ImportFields() {
  const [status, setStatus] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data;
          for (const row of rows) {
            await addDoc(collection(db, 'fields'), {
              fieldName: row.fieldName,
              farmName: row.farmName,
              gpsAcres: Number(row.gpsAcres),
              fsaAcres: Number(row.fsaAcres),
              county: row.county,
              farmNumber: row.farmNumber,
              tractNumber: row.tractNumber,
              fsaFieldNumber: row.fsaFieldNumber,
              operator: row.operator,
              operatorRentShare: Number(row.operatorRentShare),
              operatorExpenseShare: Number(row.operatorExpenseShare),
              landowner: row.landowner,
              landownerRentShare: Number(row.landownerRentShare),
              landownerExpenseShare: Number(row.landownerExpenseShare),
              crops: {},
              boundary: null
            });
          }
          setStatus('Fields imported successfully!');
        } catch (err) {
          console.error(err);
          setStatus('Error importing fields.');
        }
      }
    });
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow text-sm">
      <h2 className="text-xl font-bold mb-4">Import Fields from CSV</h2>
      <input type="file" accept=".csv" onChange={handleFileUpload} className="mb-4" />
      {status && <div className="mt-2 text-green-600 font-medium">{status}</div>}
    </div>
  );
}
