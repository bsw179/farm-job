// src/pages/ManagePartners.jsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export default function ManagePartners() {
  const [activeTab, setActiveTab] = useState('vendors');
  const [vendors, setVendors] = useState([]);
  const [applicators, setApplicators] = useState([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const fetchPartners = async () => {
      const vendorsSnap = await getDocs(collection(db, 'vendors'));
      const applicatorsSnap = await getDocs(collection(db, 'applicators'));
      setVendors(vendorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setApplicators(applicatorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchPartners();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const data = { name: newName.trim(), active: true };
    const target = activeTab === 'vendors' ? 'vendors' : 'applicators';
    await addDoc(collection(db, target), data);
    setNewName('');
    const updated = await getDocs(collection(db, target));
    activeTab === 'vendors'
      ? setVendors(updated.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      : setApplicators(updated.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleToggle = async (id, current, type) => {
    const ref = doc(db, type, id);
    await updateDoc(ref, { active: !current });
    const updated = await getDocs(collection(db, type));
    type === 'vendors'
      ? setVendors(updated.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      : setApplicators(updated.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleDelete = async (id, type) => {
    await deleteDoc(doc(db, type, id));
    const updated = await getDocs(collection(db, type));
    type === 'vendors'
      ? setVendors(updated.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      : setApplicators(updated.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const data = activeTab === 'vendors' ? vendors : applicators;
  const type = activeTab;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Manage Partners</h1>
      <div className="flex gap-4 mb-4">
        <button
          className={`px-4 py-2 rounded ${activeTab === 'vendors' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('vendors')}
        >
          Vendors
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === 'applicators' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('applicators')}
        >
          Applicators
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={`Add new ${type.slice(0, -1)}`}
          className="border px-3 py-1 rounded w-64"
        />
        <button onClick={handleAdd} className="bg-green-600 text-white px-4 py-1 rounded">Add</button>
      </div>

      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Name</th>
            <th className="p-2">Active</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id} className="border-t">
              <td className="p-2">{item.name}</td>
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={item.active}
                  onChange={() => handleToggle(item.id, item.active, type)}
                />
              </td>
              <td className="p-2">
                <button
                  onClick={() => handleDelete(item.id, type)}
                  className="text-red-600 text-sm"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
