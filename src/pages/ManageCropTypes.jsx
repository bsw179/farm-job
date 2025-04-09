import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const iconOptions = [
    '🌾', '🌱', '🚫', '🌽', '🥔', '🌻', '🍅', '🥦', '🫘', '🌴', '🟫', '⬜'
  ];
  
const colorOptions = ['green-600', 'yellow-500', 'red-500', 'blue-600', 'gray-500', 'orange-500', 'purple-600', 'lime-500'];

export default function ManageCropTypes() {
  const [cropTypes, setCropTypes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    abbreviation: '',
    icon: '',
    color: '',
    includeInSummary: true,
    isRealCrop: false,
    unitSeeds: '',
    unitWeight: '',
    defaultUnits: '',
    plantingUnitOptions: '',
    riceTypes: '',
    metricKey: ''
  });

  useEffect(() => {
    const fetchCropTypes = async () => {
      const snapshot = await getDocs(collection(db, 'cropTypes'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const unique = data.filter((item, index, self) =>
        index === self.findIndex((t) => t.name === item.name && t.abbreviation === item.abbreviation)
      );
      setCropTypes(unique);
    };
    fetchCropTypes();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleEdit = (crop) => {
    setEditingId(crop.id);
    setForm({
      name: crop.name || '',
      abbreviation: crop.abbreviation || '',
      icon: crop.icon || '',
      color: crop.color || '',
      includeInSummary: crop.includeInSummary ?? true,
      isRealCrop: crop.isRealCrop ?? false,
      unitSeeds: crop.unitSeeds || '',
      unitWeight: crop.unitWeight || '',
      defaultUnits: (crop.defaultUnits || []).join(', '),
      plantingUnitOptions: (crop.plantingUnitOptions || []).join(', '),
      metricKey: crop.metricKey || '',
      riceTypes: (crop.riceTypes || []).join(', ')
    });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'cropTypes', id));
    setCropTypes(prev => prev.filter(crop => crop.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setForm({
        name: '', abbreviation: '', icon: '', color: '', includeInSummary: true, isRealCrop: false,
        unitSeeds: '', unitWeight: '', defaultUnits: '', plantingUnitOptions: '', riceTypes: ''
      });
    }
  };

  const handleSubmit = async () => {
    const data = {
      ...form,
      unitSeeds: form.unitSeeds ? parseInt(form.unitSeeds) : null,
      unitWeight: form.unitWeight ? parseFloat(form.unitWeight) : null,
      defaultUnits: form.defaultUnits ? form.defaultUnits.split(',').map(s => s.trim()) : [],
      plantingUnitOptions: form.plantingUnitOptions ? form.plantingUnitOptions.split(',').map(s => s.trim()) : [],
      riceTypes: form.riceTypes ? form.riceTypes.split(',').map(s => s.trim()) : []
    };

    if (editingId) {
      await updateDoc(doc(db, 'cropTypes', editingId), data);
    } else {
      await addDoc(collection(db, 'cropTypes'), data);
    }

    setForm({
      name: '', abbreviation: '', icon: '', color: '', includeInSummary: true, isRealCrop: false,
      unitSeeds: '', unitWeight: '', defaultUnits: '', plantingUnitOptions: '', riceTypes: ''
    });
    setEditingId(null);

    const snapshot = await getDocs(collection(db, 'cropTypes'));
    const updatedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const unique = updatedData.filter((item, index, self) =>
      index === self.findIndex((t) => t.name === item.name && t.abbreviation === item.abbreviation)
    );
    setCropTypes(unique);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">Manage Crop Types</h1>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div><Label>Name</Label><Input name="name" value={form.name} onChange={handleChange} /></div>
          <div><Label>Abbreviation</Label><Input name="abbreviation" value={form.abbreviation} onChange={handleChange} /></div>
          <div>
          <div>
  <Label>Metric Key</Label>
  <Input
    name="metricKey"
    value={form.metricKey}
    onChange={handleChange}
    placeholder="e.g., riceLong, beans, fallow"
  />
</div>

            <Label>Icon</Label>
            <Select value={form.icon} onValueChange={(val) => setForm({ ...form, icon: val })}>
              <SelectTrigger><SelectValue placeholder="Select Icon" /></SelectTrigger>
              <SelectContent>
                {iconOptions.map(icon => (
                  <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Color</Label>
            <Select value={form.color} onValueChange={(val) => setForm({ ...form, color: val })}>
              <SelectTrigger><SelectValue placeholder="Select Color" /></SelectTrigger>
              <SelectContent>
                {colorOptions.map(color => (
                  <SelectItem key={color} value={color}>{color}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch name="includeInSummary" checked={form.includeInSummary} onCheckedChange={(val) => setForm({ ...form, includeInSummary: val })} />
            <Label>Include in Summary</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch name="isRealCrop" checked={form.isRealCrop} onCheckedChange={(val) => setForm({ ...form, isRealCrop: val })} />
            <Label>Real Crop (used in planting)</Label>
          </div>
          {form.name === 'Rice' && (
            <div className="col-span-2">
              <Label>Rice Types (comma-separated)</Label>
              <Input name="riceTypes" value={form.riceTypes} onChange={handleChange} />
            </div>
          )}
        </div>
        <Button onClick={handleSubmit}>{editingId ? 'Update Crop Type' : 'Save Crop Type'}</Button>
      </Card>

      <Card className="p-4">
        <h2 className="text-md font-semibold mb-2">Existing Crop Types</h2>
        <ul className="text-sm space-y-1">
          {cropTypes.map((crop) => (
            <li key={crop.id} className="flex flex-col gap-1 hover:bg-gray-100 px-2 py-2 rounded">
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleEdit(crop)}>
                  <span className="text-lg">{crop.icon}</span>
                  <span>{crop.name}</span>
                  <span className="text-gray-500 text-xs">({crop.abbreviation})</span>
                  {crop.isRealCrop && <span className="text-green-600 text-xs ml-2">• real crop</span>}
                </div>
                <Button variant="outline" size="sm" onClick={() => handleDelete(crop.id)}>Delete</Button>
              </div>
              {crop.name === 'Rice' && crop.riceTypes && crop.riceTypes.length > 0 && (
                <div className="ml-8 text-xs text-gray-500">Types: {crop.riceTypes.join(', ')}</div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}