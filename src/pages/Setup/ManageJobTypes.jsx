import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/Card';

export default function ManageJobTypes() {
  const [jobTypes, setJobTypes] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [newType, setNewType] = useState({
    name: '',
    productType: '',
    defaultUnit: '',
    subTypes: '',
    requiresWater: false
  });

  useEffect(() => {
    const fetchJobTypes = async () => {
      const snap = await getDocs(collection(db, 'jobTypes'));
      const types = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJobTypes(types);
    };
    fetchJobTypes();
  }, []);

  const handleSave = async () => {
    const id = newType.name.toLowerCase();
    const payload = {
      ...newType,
      subTypes: newType.subTypes.split(',').map(s => s.trim()).filter(Boolean),
      name: newType.name.trim()
    };
    await setDoc(doc(db, 'jobTypes', id), payload);
    setJobTypes(prev => {
      const existing = prev.find(j => j.name === payload.name);
      return existing
        ? prev.map(j => (j.name === payload.name ? payload : j))
        : [...prev, payload];
    });
    setNewType({ name: '', productType: '', defaultUnit: '', subTypes: '', requiresWater: false });
    setEditingIndex(null);
  };

  const handleEdit = (type) => {
    setNewType({
      name: type.name,
      productType: type.productType,
      defaultUnit: type.defaultUnit,
      subTypes: (type.subTypes || []).join(', '),
      requiresWater: type.requiresWater || false
    });
    setEditingIndex(type.name);
  };

  const handleDelete = async (name) => {
    await deleteDoc(doc(db, 'jobTypes', name.toLowerCase()));
    setJobTypes(prev => prev.filter(j => j.name !== name));
  };

  return (
    <div className="p-6">
      <PageHeader title="Manage Job Types" />

      <div className="grid grid-cols-5 gap-2 font-semibold mt-6 mb-2">
        <div>Name</div>
        <div>Product Type</div>
        <div>Default Unit</div>
        <div>Requires Water</div>
        <div>Actions</div>
      </div>

      {jobTypes.map((type) => (
        <Card key={type.name} className="grid grid-cols-5 gap-2 items-center p-4 mb-2">
          <div>{type.name}</div>
          <div>{type.productType}</div>
          <div>{type.defaultUnit}</div>
          <div>{type.requiresWater ? 'Yes' : 'No'}</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleEdit(type)}>Edit</Button>
            <Button size="sm" variant="destructive" onClick={() => handleDelete(type.name)}>Delete</Button>
          </div>
        </Card>
      ))}

      <h3 className="text-lg font-semibold mt-6">{editingIndex ? 'Edit Job Type' : 'Add New Job Type'}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
        <Input
          placeholder="Name (e.g. Seeding)"
          value={newType.name}
          onChange={(e) => setNewType({ ...newType, name: e.target.value })}
        />
        <select
          value={newType.productType}
          onChange={(e) => setNewType({ ...newType, productType: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="">No Product</option>
          <option value="seed">Seed</option>
          <option value="chemical">Chemical</option>
          <option value="fertilizer">Fertilizer</option>
        </select>
        <Input
          placeholder="Default Unit (e.g. units/acre)"
          value={newType.defaultUnit}
          onChange={(e) => setNewType({ ...newType, defaultUnit: e.target.value })}
        />
        <Input
          placeholder="Subtypes (comma separated)"
          value={newType.subTypes}
          onChange={(e) => setNewType({ ...newType, subTypes: e.target.value })}
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={newType.requiresWater}
            onChange={() => setNewType(prev => ({ ...prev, requiresWater: !prev.requiresWater }))}
          />
          Requires Water Volume
        </label>
      </div>

      <div className="mt-4">
        <Button onClick={handleSave}>{editingIndex ? 'Update Type' : 'Add Job Type'}</Button>
      </div>
    </div>
  );
}
