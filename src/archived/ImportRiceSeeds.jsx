// src/pages/ImportRiceSeeds.jsx
import React, { useState } from 'react';
import Papa from 'papaparse';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function ImportRiceSeeds() {
  const [csvText, setCsvText] = useState('');

  const handleImport = async () => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const riceSeedData = results.data.map((row) => ({
          ...row,
          type: 'Seed',
          crop: 'Rice',
        }));
        for (let seed of riceSeedData) {
          await addDoc(collection(db, 'products'), seed);
        }
        alert('Rice seeds imported!');
        setCsvText('');
      },
    });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Import Rice Seeds (Paste CSV)</h2>
      <textarea
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
        rows={10}
        className="w-full border p-3 text-sm font-mono rounded mb-4"
        placeholder="Paste CSV data here"
      />
      <button
        onClick={handleImport}
        className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700"
      >
        Import Rice Seeds
      </button>
    </div>
  );
}
