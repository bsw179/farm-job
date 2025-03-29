// src/components/TopBar.jsx
import React, { useContext, useRef, useState, useEffect } from 'react';
import { CropYearContext } from '../context/CropYearContext';
import { useNavigate } from 'react-router-dom';

export default function TopBar() {
  const { cropYear, setCropYear } = useContext(CropYearContext);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (page) => {
    setShowMenu(false);
    if (page === 'Logout') return; // Hook up auth later
    if (page === 'Dashboard') return navigate('/');
    navigate(`/${page.replace(/\s+/g, '-').toLowerCase()}`);
  };

  return (
    <div className="flex justify-between items-center px-6 py-4 border-b bg-white shadow-sm">
      <h1 className="text-xl font-extrabold text-blue-800 tracking-tight">🌾 Farm Job</h1>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCropYear((y) => y - 1)}
          className="text-blue-600 hover:text-blue-800 text-lg font-bold"
        >
          ⬅
        </button>
        <span className="text-lg font-semibold text-gray-700">{cropYear}</span>
        <button
          onClick={() => setCropYear((y) => y + 1)}
          className="text-blue-600 hover:text-blue-800 text-lg font-bold"
        >
          ➡
        </button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu((prev) => !prev)}
            className="w-9 h-9 rounded-full bg-blue-800 text-white font-bold flex items-center justify-center"
          >
            BW
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border shadow rounded text-sm z-50">
              <div className="px-4 py-2 border-b font-semibold">User Profile</div>
              <button onClick={() => handleNavigate('Profile')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Profile</button>
              <button onClick={() => handleNavigate('Settings')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Settings</button>
              <button onClick={() => handleNavigate('Logout')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Logout</button>
              <div className="px-4 py-2 border-t font-semibold">Setup</div>
              <button onClick={() => handleNavigate('Import Products')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Import Products</button>
              <button onClick={() => handleNavigate('Field Import')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Field Import</button>
              <button onClick={() => handleNavigate('Boundary Upload')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Boundary Upload</button>
              <button onClick={() => handleNavigate('Manage Job Types')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Manage Job Types</button>
              <button onClick={() => handleNavigate('Audit Log')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Audit Log</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
