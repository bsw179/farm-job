// src/components/TopBar.jsx
import React, { useContext, useRef, useEffect, useState } from 'react';
import { CropYearContext } from '../context/CropYearContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

export default function TopBar({ onNavigate }) {
  const { cropYear, setCropYear } = useContext(CropYearContext);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePageChange = (page) => {
    setShowMenu(false);
    if (onNavigate) onNavigate(page);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-blue-900 text-white shadow-md rounded-b-md mb-4">
      <div className="font-extrabold text-xl tracking-wide">Farm Job</div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCropYear((y) => y - 1)}
            className="text-white hover:text-blue-300 text-lg font-bold"
          >⬅</button>
          <span className="text-white font-semibold text-lg">{cropYear}</span>
          <button
            onClick={() => setCropYear((y) => y + 1)}
            className="text-white hover:text-blue-300 text-lg font-bold"
          >➡</button>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu((prev) => !prev)}
            className="w-9 h-9 rounded-full bg-white text-blue-900 font-bold flex items-center justify-center"
          >BW</button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border shadow rounded text-sm z-50 text-gray-800">
              <div className="px-4 py-2 border-b font-semibold">User Profile</div>
              <button onClick={() => handlePageChange('Profile Settings')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Profile Settings</button>
              <button onClick={() => handlePageChange('Manage Users')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Manage Users</button>
              <button
  onClick={() => {
    setShowMenu(false);
    signOut(auth).catch((err) => {
      console.error('Logout failed:', err);
    });
  }}
  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 font-semibold"
>
  Logout
</button>


              <div className="px-4 py-2 border-t font-semibold">Setup</div>
              <button onClick={() => handlePageChange('Products')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Products</button>
              <button onClick={() => handlePageChange('Manage Partners')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Manage Partners</button>
              <button onClick={() => handlePageChange('Manage Crop Types')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Manage Crop Types</button>
              <button onClick={() => handlePageChange('Import Boundaries')}className="w-full text-left px-4 py-2 hover:bg-gray-100">Import Boundaries</button>
              <button onClick={() => handlePageChange('Manage Job Types')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Manage Job Types</button>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
