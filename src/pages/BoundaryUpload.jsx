import React, { useState } from 'react';
// import { Buffer } from 'buffer';
// window.Buffer = Buffer;

import shp from 'shpjs';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import db from '../firebase';

export default function BoundaryUpload() {
  const [message, setMessage] = useState('');
  const [features, setFeatures] = useState([]);
  const [fieldOptions, setFieldOptions] = useState([]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMessage('Shapefile upload temporarily disabled for testing.');

    // try {
    //   const arrayBuffer = await file.arrayBuffer();
    //   const geojson = await shp(arrayBuffer);
    //   const fieldsSnap = await getDocs(collection(db, 'fields'));
    //   const allFields = fieldsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    //   setFeatures(
    //     geojson.features.map((feat) => {
    //       const name = feat.properties?.name || '';
    //       const match = allFields.find(f => f.fieldName.trim().toLowerCase() === name.trim().toLowerCase());
    //       return { geometry: feat.geometry, fieldId: match?.id || '', fieldNameGuess: name };
    //     })
    //   );

    //   setFieldOptions(allFields);
    //   setMessage(`Loaded ${geojson.features.length} boundaries.`);
    // } catch (err) {
    //   console.error(err);
    //   setMessage('Error reading shapefile.');
    // }
  };

  const handleSave = async () => {
    const valid = features.filter(f => f.fieldId);
    for (const item of valid) {
      const ref = doc(db, 'fields', item.fieldId);
      await updateDoc(ref, {
        boundary: {
          geojson: item.geometry,
          year: new Date().getFullYear()
        }
      });
    }
    setMessage(`Saved ${valid.length} boundaries.`);
  };

  const updateMatch = (index, fieldId) => {
    setFeatures(prev => {
      const copy = [...prev];
      copy[index].fieldId = fieldId;
      return copy;
    });
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Upload Field Boundaries (Shapefile)</h2>
      <input type="file" accept=".zip" onChange={handleFile} className="mb-4" />
      {message && <p className="text-sm text-blue-700">{message}</p>}

      {features.length > 0 && (
        <div className="bg-white p-4 rounded shadow mt-4 text-sm">
          <h3 className="font-semibold mb-2">Boundary Matches</h3>
          {features.map((f, i) => (
            <div key={i} className="mb-2 flex gap-3 items-center">
              <div className="w-48 truncate">🗂 {f.fieldNameGuess}</div>
              <select
                value={f.fieldId}
                onChange={(e) => updateMatch(i, e.target.value)}
                className="border p-1 rounded w-full"
              >
                <option value="">Select Field</option>
                {fieldOptions.map((fld) => (
                  <option key={fld.id} value={fld.id}>
                    {fld.fieldName} – {fld.farmName}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button onClick={handleSave} className="mt-4 bg-blue-700 text-white px-4 py-2 rounded">Save Boundaries</button>
        </div>
      )}
    </div>
  );
}
