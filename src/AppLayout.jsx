import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Fields from './pages/Fields';
import FieldDetail from './pages/FieldDetail';
import ImportFields from './pages/ImportFields';
import MapViewer from './pages/MapViewer';
import BoundaryImport from './pages/BoundaryImport';
import ImportSeeds from './pages/ImportSeeds';
import ImportFertilizers from './pages/ImportFertilizers';
import ImportChemicals from './pages/ImportChemicals';
import Reports from './pages/Reports';

export default function AppLayout() {
  const [activePage, setActivePage] = useState('Dashboard');
  const [mobileMenu, setMobileMenu] = useState(null);
  const [cropYear, setCropYear] = useState(2025);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);
  const navigate = useNavigate();

  const pages = {
    Farm: ['Fields', 'Jobs', 'Crop Budget', 'Reminders', 'Reports'],
    Mapping: ['Map Viewer', 'Map Creator'],
    Records: ['Field History', 'Crop History', 'Calendar', 'Documents', 'Field Metrics', 'Inventory']
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePageChange = (page) => {
    setActivePage(page);
    navigate('/');
  };

  return (
    <div className="flex min-h-screen font-sans text-gray-800">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white shadow-xl border-r border-gray-200 overflow-y-auto max-h-screen sticky top-0">
        <div className="p-6">
          <h2 className="text-2xl font-extrabold text-blue-800 mb-8 tracking-tight">🌾 Farm Job</h2>
          <nav className="flex flex-col gap-4 text-sm">
            <button
              onClick={() => handlePageChange('Dashboard')}
              className={`text-left px-3 py-1.5 rounded-md transition font-medium ${activePage === 'Dashboard' ? 'bg-blue-100 text-blue-800' : 'hover:bg-blue-50'}`}
            >
              Dashboard
            </button>
            {Object.entries(pages).map(([label, pageList]) => (
              <details key={label} className="group">
                <summary className="cursor-pointer text-xs uppercase font-bold text-gray-600 group-open:text-blue-700">{label}</summary>
                <div className="flex flex-col mt-1 ml-2 gap-1">
                  {pageList.map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`text-left px-3 py-1.5 rounded-md transition font-medium ${activePage === page ? 'bg-blue-100 text-blue-800' : 'hover:bg-blue-50'}`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </details>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gradient-to-br from-gray-50 to-white p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3 items-center">
            <h1 className="text-2xl font-extrabold text-blue-800 tracking-tight">🌾 Farm Job</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2 items-center">
              <button onClick={() => setCropYear((y) => y - 1)} className="text-blue-600 hover:text-blue-800 font-bold">⬅</button>
              <span className="text-lg font-semibold text-gray-700">{cropYear}</span>
              <button onClick={() => setCropYear((y) => y + 1)} className="text-blue-600 hover:text-blue-800 font-bold">➡</button>
            </div>
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-9 h-9 rounded-full bg-blue-800 text-white font-bold"
              >
                BW
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border shadow rounded text-sm z-50">
                  <div className="px-4 py-2 border-b font-semibold">User Profile</div>
                  <button onClick={() => handlePageChange('Profile Settings')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Profile Settings</button>
                  <button onClick={() => handlePageChange('Manage Users')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Manage Users</button>
                  <button onClick={() => setShowProfileMenu(false)} className="w-full text-left px-4 py-2 hover:bg-gray-100">Logout</button>
                  <div className="px-4 py-2 border-t font-semibold">Setup</div>
                  <button onClick={() => handlePageChange('Import Seeds')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Import Seeds</button>
                  <button onClick={() => handlePageChange('Import Fertilizers')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Import Fertilizers</button>
                  <button onClick={() => handlePageChange('Import Chemicals')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Import Chemicals</button>
                  <button onClick={() => handlePageChange('Import Fields')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Field Import</button>
                  <button onClick={() => handlePageChange('Boundary Import')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Boundary Import</button>
                  <button onClick={() => handlePageChange('Manage Job Types')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Manage Job Types</button>
                  <button onClick={() => handlePageChange('Audit Log')} className="w-full text-left px-4 py-2 hover:bg-gray-100">Audit Log</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <Routes>
          <Route path="/" element={
            <>
              {activePage === 'Fields' && <Fields cropYear={cropYear} />}
              {activePage === 'Import Fields' && <ImportFields />}
              {activePage === 'Map Viewer' && <MapViewer />}
              {activePage === 'Boundary Import' && <BoundaryImport />}
              {activePage === 'Import Seeds' && <ImportSeeds />}
              {activePage === 'Import Fertilizers' && <ImportFertilizers />}
              {activePage === 'Import Chemicals' && <ImportChemicals />}
              {activePage === 'Reports' && <Reports />}
              {[
                'Fields',
                'Import Fields',
                'Map Viewer',
                'Boundary Import',
                'Import Seeds',
                'Import Fertilizers',
                'Import Chemicals',
                'Reports'
              ].indexOf(activePage) === -1 && (
                <div className="bg-white p-6 rounded-xl shadow text-gray-500 italic">
                  📄 {activePage} page content will appear here.
                </div>
              )}
            </>
          } />
          <Route path="/fields/:fieldId" element={<FieldDetail />} />
        </Routes>
      </main>
    </div>
  );
}
