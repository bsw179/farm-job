import React, { useEffect, useState } from 'react';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import db from '../firebase';

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

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Fields – Crop Year: {cropYear}</h2>

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
              <li key={field.id} className="p-3 bg-gray-100 rounded shadow-sm">
                <strong>{field.fieldName}</strong> – {field.farmName} – {field.county} – {field.gpsAcres} acres
              </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
