// src/pages/ManageJobTypes.jsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs, setDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pencil } from 'lucide-react';

export default function ManageJobTypes() {
  const [jobTypes, setJobTypes] = useState([]);
  const [modalMode, setModalMode] = useState(null); // 'add-category', 'add-jobType', or 'edit-jobType'
  const [activeEdit, setActiveEdit] = useState(null);
  const [form, setForm] = useState({ name: '', cost: '', category: '', icon: '', archived: false });

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, 'jobTypes'));
      const types = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJobTypes(types);
    };
    fetch();
  }, []);

  const openAddCategory = () => {
    setForm({ name: '', cost: '', category: '', icon: '', archived: false });
    setModalMode('add-category');
  };

  const openAddJobType = () => {
    setForm({ name: '', cost: '', category: '', icon: '', archived: false });
    setModalMode('add-jobType');
  };

  const openEditJobType = (catId, index, sub) => {
    setActiveEdit({ catId, index });
    setForm({ ...sub, cost: sub.cost || '', icon: sub.icon || '', category: catId });
    setModalMode('edit-jobType');
  };

  const handleSave = async () => {
    if (modalMode === 'add-category') {
      const id = form.name.toLowerCase().replace(/\s+/g, '-');
      await setDoc(doc(db, 'jobTypes', id), { name: form.name, subTypes: [] });
      setJobTypes(prev => [...prev, { id, name: form.name, subTypes: [] }]);
    } else if (modalMode === 'add-jobType') {
      const catIndex = jobTypes.findIndex(j => j.id === form.category);
      const updated = [...jobTypes];
      updated[catIndex].subTypes.push({
        name: form.name,
        cost: parseFloat(form.cost || 0),
        archived: false,
        icon: form.icon || ''
      });
      await updateDoc(doc(db, 'jobTypes', form.category), { subTypes: updated[catIndex].subTypes });
      setJobTypes(updated);
    } else if (modalMode === 'edit-jobType') {
      const { catId, index } = activeEdit;
      const updated = [...jobTypes];
      updated.find(j => j.id === catId).subTypes[index] = {
        name: form.name,
        cost: parseFloat(form.cost || 0),
        archived: form.archived || false,
        icon: form.icon || ''
      };
      await updateDoc(doc(db, 'jobTypes', catId), {
        subTypes: updated.find(j => j.id === catId).subTypes
      });
      setJobTypes(updated);
    }
    setModalMode(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Manage Job Types</h2>
        <div className="flex gap-2">
          <Button onClick={openAddCategory}>+ Add Category</Button>
          <Button onClick={openAddJobType}>+ Add Job Type</Button>
        </div>
      </div>

      {jobTypes.map(cat => (
        <Card key={cat.id} className="mb-6 p-4">
          <h3 className="text-lg font-semibold mb-2">{cat.name}</h3>
          <div className="grid gap-2">
            {cat.subTypes?.map((sub, i) => (
              <Card key={i} className="p-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{sub.name} {sub.icon && <span>{sub.icon}</span>}</p>
                  <p className="text-sm text-gray-600">${sub.cost?.toFixed(2)}/acre {sub.archived && '(archived)'}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openEditJobType(cat.id, i, sub)}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </Card>
            ))}
          </div>
        </Card>
      ))}

      <Dialog open={!!modalMode} onOpenChange={() => setModalMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'add-category' && 'Add Category'}
              {modalMode === 'add-jobType' && 'Add Job Type'}
              {modalMode === 'edit-jobType' && 'Edit Job Type'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(modalMode === 'add-category') && (
              <Input
                placeholder="Category Name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            )}
            {(modalMode === 'add-jobType' || modalMode === 'edit-jobType') && (
              <>
                <Input
                  placeholder="Job Type Name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Cost per acre"
                  value={form.cost}
                  onChange={e => setForm({ ...form, cost: e.target.value })}
                />
                {/* Dynamically show icons in the dropdown */}
{/* Automatically pull icons from assets/icons using import.meta.glob */}
{(() => {
  const iconFiles = import.meta.glob('../../assets/icons/*.svg', { eager: true });
  const iconOptions = Object.keys(iconFiles).map(path => {
    const label = path.split('/').pop().replace('.svg', '');
    return { name: label, path };
  });

  return (
    <select
      className="border p-2 rounded w-full"
      value={form.icon}
      onChange={e => setForm({ ...form, icon: e.target.value })}
    >
      <option value="">Select Icon</option>
      {iconOptions.map(opt => (
        <option key={opt.name} value={opt.name}>{opt.name}</option>
      ))}
    </select>
  );
})()}
                {modalMode === 'add-jobType' && (
                  <select
                    className="border p-2 rounded w-full"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {jobTypes.map(j => (
                      <option key={j.id} value={j.id}>{j.name}</option>
                    ))}
                  </select>
                )}
                {modalMode === 'edit-jobType' && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.archived || false}
                      onChange={() => setForm({ ...form, archived: !form.archived })}
                    />
                    Archive this job type
                  </label>
                )}
              </>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
