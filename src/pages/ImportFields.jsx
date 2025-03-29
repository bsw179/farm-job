import React, { useState } from 'react';
import Papa from 'papaparse';
import { collection, addDoc } from 'firebase/firestore';
import db from '../firebase';

export default function ImportFields() {
  const [message, setMessage] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function (results) {
        const data = results.data;
        let success = 0;
        let failed = 0;

        for (const row of data) {
          try {
            await addDoc(collection(db, 'fields'), {
              ...row,
              gpsAcres: parseFloat(row.gpsAcres),
              fsaAcres: parseFloat(row.fsaAcres),
              operatorRentShare: parseFloat(row.operatorRentShare),
              operatorExpenseShare: parseFloat(row.operatorExpenseShare),
              landownerRentShare: parseFloat(row.landownerRentShare),
              landownerExpenseShare: parseFloat(row.landownerExpenseShare),
              cropYear: new Date().getFullYear()
            });
            success++;
          } catch (err) {
            console.error('Import failed for row:', row, err);
            failed++;
          }
        }

        setMessage(`Imported ${success} fields. ${failed} failed.`);
      }
    });
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Import Fields from CSV</h2>
      <input type="file" accept=".csv" onChange={handleFileUpload} className="mb-4" />
      {message && <p className="text-green-700 font-semibold">{message}</p>}
      <p className="text-sm text-gray-600">Make sure your file matches the <strong>fields-template.csv</strong> format.</p>
    </div>
  );
}
