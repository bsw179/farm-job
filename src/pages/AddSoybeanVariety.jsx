import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import db from '../firebase';

export default function AddSoybeanVariety() {
  const [message, setMessage] = useState('');
  const [seed, setSeed] = useState({
    name: '',
    crop: 'Soybeans',
    unitType: '',
    unitLabel: '',
    unitAbbrev: '',
    seedsPerUnit: '',
    lbsPerBushel: '',
    technology: '',
    manufacturer: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSeed(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      await addDoc(collection(db, 'products'), {
        name: seed.name,
        type: 'Seed',
        crop: seed.crop,
        unitType: seed.unitType,
        unitLabel: seed.unitLabel,
        unitAbbrev: seed.unitAbbrev,
        seedsPerUnit: seed.unitType === 'population' ? parseFloat(seed.seedsPerUnit) : null,
        lbsPerBushel: seed.unitType === 'weight' ? parseFloat(seed.lbsPerBushel) : null,
        tech: seed.technology,
        manufacturer: seed.manufacturer,
        rateMode: seed.unitType === 'population' ? 'population' : 'weight'
      });
      setMessage('Soybean variety added!');
      setSeed({ ...seed, name: '', unitLabel: '', unitAbbrev: '', seedsPerUnit: '', lbsPerBushel: '', technology: '', manufacturer: '' });
    } catch (err) {
      console.error('Save failed', err);
      setMessage('Error saving variety.');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Add Soybean Variety</h2>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <input name="name" placeholder="Product Name" value={seed.name} onChange={handleChange} className="border p-2 rounded" />
        <select name="unitType" value={seed.unitType} onChange={handleChange} className="border p-2 rounded">
          <option value="">Unit Type</option>
          <option value="weight">Weight</option>
          <option value="population">Population</option>
        </select>
        <input name="unitLabel" placeholder="Unit Label (e.g. Pounds)" value={seed.unitLabel} onChange={handleChange} className="border p-2 rounded" />
        <input name="unitAbbrev" placeholder="Unit Abbreviation (e.g. lb)" value={seed.unitAbbrev} onChange={handleChange} className="border p-2 rounded" />
        {seed.unitType === 'population' && (
          <input name="seedsPerUnit" placeholder="Seeds per Unit" value={seed.seedsPerUnit} onChange={handleChange} className="border p-2 rounded" />
        )}
        {seed.unitType === 'weight' && (
          <input name="lbsPerBushel" placeholder="Lbs per Bushel" value={seed.lbsPerBushel} onChange={handleChange} className="border p-2 rounded" />
        )}
        <input name="technology" placeholder="Technology (e.g. XtendFlex)" value={seed.technology} onChange={handleChange} className="border p-2 rounded" />
        <input name="manufacturer" placeholder="Manufacturer" value={seed.manufacturer} onChange={handleChange} className="border p-2 rounded" />
      </div>
      <button onClick={handleSave} className="mt-4 bg-blue-700 text-white px-4 py-2 rounded">Save Variety</button>
      {message && <p className="mt-2 text-green-700 font-semibold">{message}</p>}
    </div>
  );
}
