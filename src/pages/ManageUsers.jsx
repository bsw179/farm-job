import React, { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useUser } from '@/context/UserContext';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
export default function ManageUsers() {
  const { role: currentUserRole } = useUser();
const { user, refreshUserData } = useUser();

  const [users, setUsers] = useState([]);
const [newEmail, setNewEmail] = useState('');
const [newPassword, setNewPassword] = useState('');
const [newRole, setNewRole] = useState('viewer');
const [newFirstName, setNewFirstName] = useState('');
const [newLastName, setNewLastName] = useState('');
const [createError, setCreateError] = useState('');
const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, 'users'));
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(data);
    };
    fetchUsers();
  }, []);

  const updateRole = async (userId, newRole) => {
    await updateDoc(doc(db, 'users', userId), { role: newRole });
    setUsers(prev =>
      prev.map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      )
    );
  };
const handleCreateUser = async () => {
  setCreateError('');
  if (!newEmail || !newPassword || !newFirstName || !newLastName) {
    setCreateError('All fields are required.');
    return;
  }

  try {
    const result = await createUserWithEmailAndPassword(auth, newEmail, newPassword);
    const uid = result.user.uid;

    await setDoc(doc(db, 'users', uid), {
      email: newEmail,
      role: newRole,
      firstName: newFirstName,
      lastName: newLastName
    });

    setUsers(prev => [
      ...prev,
      {
        id: uid,
        email: newEmail,
        role: newRole,
        firstName: newFirstName,
        lastName: newLastName
      }
    ]);

    setNewEmail('');
    setNewPassword('');
    setNewFirstName('');
    setNewLastName('');
    setNewRole('viewer');
  } catch (err) {
    console.error(err);
    setCreateError('Failed to create user. ' + err.message);
  }
};
  if (currentUserRole !== 'admin') {
    return (
      <div className="p-6 text-red-600 font-semibold">
        🚫 You do not have permission to manage users.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Manage Users</h1>
<div className="border rounded p-4 space-y-3 bg-gray-50">
  <h2 className="font-semibold">Create New User</h2>

  <div className="flex flex-wrap gap-4">
    <input
      type="text"
      placeholder="First Name"
      value={newFirstName}
      onChange={(e) => setNewFirstName(e.target.value)}
      className="border px-2 py-1 rounded w-full md:w-[200px]"
    />
    <input
      type="text"
      placeholder="Last Name"
      value={newLastName}
      onChange={(e) => setNewLastName(e.target.value)}
      className="border px-2 py-1 rounded w-full md:w-[200px]"
    />
    <input
      type="email"
      placeholder="Email"
      value={newEmail}
      onChange={(e) => setNewEmail(e.target.value)}
      className="border px-2 py-1 rounded w-full md:w-[240px]"
    />
    <input
      type="password"
      placeholder="Password"
      value={newPassword}
      onChange={(e) => setNewPassword(e.target.value)}
      className="border px-2 py-1 rounded w-full md:w-[200px]"
    />
    <select
      value={newRole}
      onChange={(e) => setNewRole(e.target.value)}
      className="border px-2 py-1 rounded w-full md:w-[160px]"
    >
      <option value="viewer">viewer</option>
      <option value="manager">manager</option>
      <option value="admin">admin</option>
    </select>
  </div>

  <button
    onClick={handleCreateUser}
    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
  >
    Create User
  </button>

  {createError && <p className="text-red-600 text-sm">{createError}</p>}
</div>

      <table className="min-w-full border text-sm">
        <thead>
  <tr className="bg-gray-100 text-left">
  <th className="p-2 border">Email</th>
  <th className="p-2 border">UID</th>
  <th className="p-2 border">Name</th>
  <th className="p-2 border">Current Role</th>
  <th className="p-2 border">Change Role</th>
  <th className="p-2 border">Actions</th>

</tr>


        </thead>
        <tbody>
  {users.map(u => (
    <tr key={u.id} className="border-t">
      <td className="p-2 border">{u.email}</td>
      <td className="p-2 border font-mono text-xs text-gray-600">{u.id}</td>
      <td className="p-2 border">
        {u.firstName} {u.lastName}
      </td>
      <td className="p-2 border">{u.role}</td>
      <td className="p-2 border">
        <select
          value={u.role}
          onChange={(e) => updateRole(u.id, e.target.value)}
          className="border p-1 rounded"
        >
          <option value="admin">admin</option>
          <option value="manager">manager</option>
          <option value="viewer">viewer</option>
        </select>
      </td>
      <td className="p-2 border">
        <button
          onClick={() => setEditingUser(u)}
          className="text-blue-600 hover:underline text-sm"
        >
          ✏️ Edit
        </button>
      </td>
    </tr>
  ))}
</tbody>

      </table>
      {editingUser && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full relative">
      <button
        onClick={() => setEditingUser(null)}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
      >
        ✖
      </button>

      <h2 className="text-lg font-bold mb-4">Edit User</h2>

      <div className="space-y-3">
        <input
          type="text"
          value={editingUser.firstName || ''}
          onChange={(e) =>
            setEditingUser({ ...editingUser, firstName: e.target.value })
          }
          placeholder="First Name"
          className="w-full border px-3 py-2 rounded"
        />
        <input
          type="text"
          value={editingUser.lastName || ''}
          onChange={(e) =>
            setEditingUser({ ...editingUser, lastName: e.target.value })
          }
          placeholder="Last Name"
          className="w-full border px-3 py-2 rounded"
        />
        <input
          type="email"
          value={editingUser.email}
          onChange={(e) =>
            setEditingUser({ ...editingUser, email: e.target.value })
          }
          placeholder="Email"
          className="w-full border px-3 py-2 rounded"
        />
        <select
          value={editingUser.role}
          onChange={(e) =>
            setEditingUser({ ...editingUser, role: e.target.value })
          }
          className="w-full border px-3 py-2 rounded"
        >
          <option value="admin">admin</option>
          <option value="manager">manager</option>
          <option value="viewer">viewer</option>
        </select>
      </div>

      <button
      onClick={async () => {
  const { id, ...updates } = editingUser;
  await updateDoc(doc(db, 'users', id), updates);
  setUsers(prev =>
    prev.map(u => (u.id === id ? { ...u, ...updates } : u))
  );
console.log('🧪 user:', user);
console.log('🧪 comparing to id:', id);

  // 🔁 If you're editing your own profile, reload to refresh initials
if (user?.uid === id || user?.id === id) {
  await refreshUserData(); // 💥 pull updated name fields
}
setEditingUser(null);

}}

        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Save Changes
        
      </button>
    </div>
  </div>
)}
    </div>
  );
}
