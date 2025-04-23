import React, { useState } from 'react';
import { useUser } from '@/context/UserContext';
import { updatePassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function ProfileSettings() {
  const { user } = useUser();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleUpdateName = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        firstName,
        lastName,
      });
      setMessage('Name updated successfully');
    } catch (err) {
      console.error(err);
      setMessage('Error updating name');
    }
  };

  const handleChangePassword = async () => {
    try {
      await updatePassword(auth.currentUser, newPassword);
      setMessage('Password updated successfully');
      setNewPassword('');
    } catch (err) {
      console.error(err);
      setMessage('Error changing password');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-4 border rounded bg-white space-y-4">
      <h2 className="text-xl font-bold">Account Settings</h2>

      <div>
        <label className="block text-sm font-medium">Email</label>
        <p className="text-gray-700">{user?.email}</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Role</label>
        <p className="text-gray-700 capitalize">{user?.role}</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">First Name</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Last Name</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>

      <button
        onClick={handleUpdateName}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        Update Name
      </button>

      <div>
        <label className="block text-sm font-medium mb-1">New Password</label>
        <input
          type="password"
          className="w-full border rounded px-3 py-2"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>

      <button
        onClick={handleChangePassword}
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
      >
        Change Password
      </button>

      {message && <p className="text-sm text-center mt-2 text-blue-700">{message}</p>}
    </div>
  );
}
