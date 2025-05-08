import React, { useContext, useRef, useEffect, useState } from 'react';
import { CropYearContext } from '../context/CropYearContext';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

export default function AppHeader() {
  const { cropYear, setCropYear } = useContext(CropYearContext);
  const { user } = useUser();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user?.email?.slice(0, 2).toUpperCase() || '??';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-900 text-white flex items-center justify-between px-4 py-3 shadow-md h-16">
      {/* ☰ + Title */}
      <div className="flex items-center gap-4">
        <button
          className="md:hidden text-white text-2xl"
          onClick={() => {
            const event = new CustomEvent('toggle-mobile-nav');
            window.dispatchEvent(event);
          }}
        >
          ☰
        </button>
        <div className="font-extrabold text-xl tracking-wide">🌾 Farm Job</div>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-white bg-blue-800 hover:bg-blue-700 border border-white rounded px-3 py-1 shadow-sm hidden sm:block"
        >
          Dashboard
        </button>
      </div>

      {/* Year + User */}
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
          >
            {initials}
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border shadow rounded text-sm z-50 text-gray-800">
              <div className="px-4 py-2 border-b font-semibold">User Profile</div>
              <button onClick={() => navigate('/profile-settings')} className="w-full text-left px-4 py-2 hover:bg-gray-100">
                Account Settings
              </button>
              <button onClick={() => navigate('/manage-users')} className="w-full text-left px-4 py-2 hover:bg-gray-100">
                Manage Users
              </button>
              <button onClick={() => navigate('/admin-tools')} className="w-full text-left px-4 py-2 hover:bg-gray-100">
                Admin Tools
              </button>

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
              <button onClick={() => navigate('/products')} className="w-full text-left px-4 py-2 hover:bg-gray-100">
                Manage Products
              </button>
              <button onClick={() => navigate('/manage-partners')} className="w-full text-left px-4 py-2 hover:bg-gray-100">
                Manage Partners
              </button>
              <button onClick={() => navigate('/setup/manage-crop-types')} className="w-full text-left px-4 py-2 hover:bg-gray-100">
                Manage Crop Types
              </button>
              <button onClick={() => navigate('/setup/import-boundaries')} className="w-full text-left px-4 py-2 hover:bg-gray-100">
                Import Boundaries
              </button>
              <button onClick={() => navigate('/setup/manage-job-types')} className="w-full text-left px-4 py-2 hover:bg-gray-100">
                Manage Job Types
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
