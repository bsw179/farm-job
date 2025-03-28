import React, { useEffect, useState } from 'react';
import { collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import db from '../firebase';
import Papa from 'papaparse';

export default function Fields({ cropYear }) {
  const [fields, setFields] = useState([]);
  const [newField, setNewField] = useState({
    fieldName: '',
    farmName: '',
    gpsAcres: '',
    fsaAcres: '',
    county: '',
    farmNumber: '',
    tractNumber: '',
    fsaFieldNumber: '',
    operator: '',
    operatorRentShare: '',
    operatorExpenseShare: '',
    landowner: '',
    landownerRentShare: '',
    landownerExpenseShare: ''
  });
  const [importMessage, setImportMessage] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'fields'), (snapshot) => {
      const fieldData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFields(fieldData);
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    setNewField({ ...newField, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'fields'), {
      ...newField,
      cropYear,
      gpsAcres: parseFloat(newField.gpsAcres),
      fsaAcres: parseFloat(newField.fsaAcres),
      operatorRentShare: parseFloat(newField.operatorRentShare),
      operatorExpenseShare: parseFloat(newField.operatorExpenseShare),
      landownerRentShare: parseFloat(newField.landownerRentShare),
      landownerExpenseShare: parseFloat(newField.landownerExpenseShare)
    });
    setNewField({
      fieldName: '',
      farmName: '',
      gpsAcres: '',
      fsaAcres: '',
      county: '',
      farmNumber: '',
      tractNumber: '',
      fsaFieldNumber: '',
      operator: '',
      operatorRentShare: '',
      operatorExpenseShare: '',
      landowner: '',
      landownerRentShare: '',
      landownerExpenseShare: ''
    });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'fields', id));
  };

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
              cropYear,
              gpsAcres: parseFloat(row.gpsAcres),
              fsaAcres: parseFloat(row.fsaAcres),
              operatorRentShare: parseFloat(row.operatorRentShare),
              operatorExpenseShare: parseFloat(row.operatorExpenseShare),
              landownerRentShare: parseFloat(row.landownerRentShare),
              landownerExpenseShare: parseFloat(row.landownerExpenseShare)
            });
            success++;
          } catch (err) {
            console.error('Import failed for row:', row, err);
            failed++;
          }
        }

        setImportMessage(`Imported ${success} fields. ${failed} failed.`);
      }
    });
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Fields – Crop Year: {cropYear}</h2>

      <input type="file" accept=".csv" onChange={handleFileUpload} className="mb-4" />
      {importMessage && <p className="text-green-700 font-semibold mb-4">{importMessage}</p>}

      <form onSubmit={handleSubmit} className="bg-white shadow p-4 rounded grid grid-cols-2 gap-4 text-sm">
        {Object.keys(newField).map((key) => (
          <input
            key={key}
            name={key}
            value={newField[key]}
            onChange={handleChange}
            placeholder={key}
            className="border p-2 rounded"
          />
        ))}
        <button type="submit" className="col-span-2 bg-blue-700 text-white px-4 py-2 rounded shadow hover:bg-blue-800">
          Add Field
        </button>
      </form>

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Saved Fields</h3>
        <ul className="space-y-2 text-sm">
          {fields
            .filter((field) => field.cropYear === cropYear)
            .map((field) => (
              <li key={field.id} className="p-3 bg-gray-100 rounded shadow-sm flex justify-between items-center">
                <span>
                  <strong>{field.fieldName}</strong> – {field.farmName} – {field.county} – {field.gpsAcres} acres
                </span>
                <button onClick={() => handleDelete(field.id)} className="text-red-600 hover:underline ml-4">🗑 Delete</button>
              </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
